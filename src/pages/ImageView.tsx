import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { photoReviews, product, reviews, type Review, type ReviewPhoto } from '../data/product'
import { MORPH_NAME, getMorphSource, setMorphSource, withLocalTransition } from '../lib/morph'
import './ImageView.css'

interface Slide {
  review: Review
  photo: ReviewPhoto
}

/** flat list of every photo, used by the gallery modal and the pager pill */
const slides: Slide[] = reviews.flatMap((review) => review.photos.map((photo) => ({ review, photo })))

/**
 * Image-first view, story-style: one full-bleed card per review. Taps and
 * swipes move through the review's own photos first (progress segments on
 * the card); moving past the last photo advances to the next review.
 */
export default function ImageView() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const initialReviewIdx = Math.max(
    0,
    reviews.findIndex((r) => r.id === params.get('review')),
  )
  const initialPhotoIdx = Math.min(
    Number(params.get('photo') ?? 0) || 0,
    reviews[initialReviewIdx].photos.length - 1,
  )

  const [reviewIdx, setReviewIdx] = useState(initialReviewIdx)
  const [photoIdx, setPhotoIdx] = useState<Record<string, number>>({
    [reviews[initialReviewIdx].id]: initialPhotoIdx,
  })
  const [showMore, setShowMore] = useState(false)
  const [pagerOpen, setPagerOpen] = useState(false)
  const [dimmed, setDimmed] = useState(false)

  const outerRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ x0: 0, active: false, moved: false })

  const review = reviews[reviewIdx]
  const photoOf = (r: Review) => Math.min(photoIdx[r.id] ?? 0, r.photos.length - 1)
  const pi = photoOf(review)
  const globalIndex = slides.findIndex((s) => s.photo === review.photos[pi])

  // collapse "show more" whenever the review changes
  useEffect(() => setShowMore(false), [reviewIdx])

  // dim follows pagerOpen a frame later so its fade runs outside the morph snapshot
  useEffect(() => {
    const id = requestAnimationFrame(() => setDimmed(pagerOpen))
    return () => cancelAnimationFrame(id)
  }, [pagerOpen])

  // pre-decode every photo up front so cards are fully painted before the
  // user swipes to them — no late image pop-in on navigation
  useEffect(() => {
    slides.forEach(({ photo }) => {
      const img = new Image()
      img.src = photo.src
      img.decode?.().catch(() => {})
    })
  }, [])

  /* inner-first navigation: step through the review's photos, then reviews */
  const step = (dir: 1 | -1) => {
    const next = pi + dir
    if (next >= 0 && next < review.photos.length) {
      setPhotoIdx((p) => ({ ...p, [review.id]: next }))
    } else {
      const r2 = reviewIdx + dir
      if (r2 >= 0 && r2 < reviews.length) setReviewIdx(r2)
    }
  }

  /* drag: moves the in-card photo strip while the review has photos left in
     that direction, otherwise drags the whole card toward the next review */
  const restingTransforms = () => {
    if (stripRef.current) {
      stripRef.current.style.transition = ''
      stripRef.current.style.transform = `translate3d(${-pi * 100}%, 0, 0)`
    }
    if (outerRef.current) {
      outerRef.current.style.transition = ''
      outerRef.current.style.transform = `translate3d(${-reviewIdx * 100}%, 0, 0)`
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { x0: e.clientX, active: true, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.x0
    if (Math.abs(dx) > 5) drag.current.moved = true
    const innerCan = dx < 0 ? pi < review.photos.length - 1 : pi > 0
    if (innerCan && stripRef.current) {
      stripRef.current.style.transition = 'none'
      stripRef.current.style.transform = `translate3d(calc(${-pi * 100}% + ${dx}px), 0, 0)`
    } else if (outerRef.current) {
      outerRef.current.style.transition = 'none'
      outerRef.current.style.transform = `translate3d(calc(${-reviewIdx * 100}% + ${dx}px), 0, 0)`
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    drag.current.active = false
    const dx = e.clientX - drag.current.x0
    restingTransforms()
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1)
  }

  /* story taps: right side advances, left side goes back */
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      drag.current.moved = false
      return
    }
    if ((e.target as HTMLElement).closest('button')) return
    const rect = e.currentTarget.getBoundingClientRect()
    step(e.clientX - rect.left > rect.width * 0.35 ? 1 : -1)
  }

  /* gallery modal: the pill morphs into a grid of all photos and back */
  const toggleGallery = (next: boolean) => {
    withLocalTransition(() => flushSync(() => setPagerOpen(next)))
  }

  const selectFromGallery = (i: number) => {
    const slide = slides[i]
    const ri = reviews.indexOf(slide.review)
    const k = slide.review.photos.indexOf(slide.photo)
    withLocalTransition(() =>
      flushSync(() => {
        setPagerOpen(false)
        setReviewIdx(ri)
        setPhotoIdx((p) => ({ ...p, [slide.review.id]: k }))
      }),
    )
  }

  // open the OS share sheet for the active photo; fall back to copying the URL
  const share = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('review', review.id)
    url.searchParams.set('photo', String(pi))
    const data = {
      title: product.name,
      text: `${review.userName}'s review of ${product.name}`,
      url: url.toString(),
    }
    try {
      if (navigator.share) await navigator.share(data)
      else await navigator.clipboard?.writeText(data.url)
    } catch {
      /* user dismissed the sheet — nothing to do */
    }
  }

  const close = () => {
    const source = getMorphSource()
    if (!source) {
      navigate('/', { viewTransition: true })
      return
    }
    // retarget the reverse morph at the photo currently on screen
    const slide = slides[globalIndex]
    if (source.key.startsWith('strip-')) {
      const strip = photoReviews.find((p) => p.reviewId === slide.review.id && p.photoIndex === pi)
      if (strip) setMorphSource(`strip-${strip.id}`, source.path)
    } else {
      setMorphSource(`card-${slide.photo.id}`, source.path)
    }
    navigate(source.path, { viewTransition: true, state: { fromImageView: true } })
  }

  const prevSlide = globalIndex > 0 ? slides[globalIndex - 1] : null
  const nextSlide = globalIndex < slides.length - 1 ? slides[globalIndex + 1] : null
  const variantChips = review.variantInfo.replace(/^Bought\s*/i, '').split(', ')

  return (
    <div className={dimmed ? 'app-shell iv iv--gallery-open' : 'app-shell iv'}>
      {/* Top bar: gallery pill + close */}
      <div className="iv-topbar">
        {pagerOpen ? (
          <>
            <button className="iv-pager-backdrop" aria-label="Close gallery" onClick={() => toggleGallery(false)} />
            <div className="iv-gallery" style={{ viewTransitionName: 'photo-gallery' }} role="dialog" aria-label="All review photos">
              {/* tiles repeated 4x to exercise scrolling until there are more real photos */}
              {Array.from({ length: 4 }).flatMap((_, rep) =>
                slides.map((slide, i) => (
                  <button
                    key={`${rep}-${slide.photo.id}`}
                    className="iv-gallery__tile"
                    onClick={() => selectFromGallery(i)}
                    aria-label={`Open ${slide.review.userName}'s photo, rated ${slide.review.rating} stars`}
                  >
                    <img src={slide.photo.src} alt="" loading="lazy" />
                    <span className="iv-gallery__overlay">
                      <span className="iv-gallery__chip">
                        {slide.review.rating}
                        <img src="/assets/iv-star-white.svg" width={10} height={10} alt="" />
                      </span>
                    </span>
                  </button>
                )),
              )}
            </div>
          </>
        ) : (
          <button
            className="iv-pager"
            aria-label="Show all photos"
            style={{ viewTransitionName: 'photo-gallery' }}
            onClick={() => toggleGallery(true)}
          >
            <span className="iv-pager__cluster">
              {prevSlide && (
                <span className="iv-pager__thumb iv-pager__thumb--side iv-pager__thumb--prev">
                  <img src={prevSlide.photo.src} alt="" />
                </span>
              )}
              <span className="iv-pager__thumb iv-pager__thumb--active">
                <img src={slides[globalIndex].photo.src} alt="" />
              </span>
              {nextSlide && (
                <span className="iv-pager__thumb iv-pager__thumb--side iv-pager__thumb--next">
                  <img src={nextSlide.photo.src} alt="" />
                </span>
              )}
            </span>
          </button>
        )}
        {/* hidden while the gallery is open — tapping outside closes it */}
        {!pagerOpen && (
          <button className="iv-close" aria-label="Close" onClick={close}>
            <img src="/assets/iv-cross.svg" width={20} height={20} alt="" />
          </button>
        )}
      </div>

      {/* Story cards — one per review; photos change inside the card */}
      <div
        className="iv-story"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onTap}
      >
        <div className="iv-story__track" ref={outerRef} style={{ transform: `translate3d(${-reviewIdx * 100}%, 0, 0)` }}>
          {reviews.map((r, ri) => {
            const k = photoOf(r)
            const isActive = ri === reviewIdx
            return (
              <div className="iv-story__slide" key={r.id}>
                <div className="iv-scard">
                  <div
                    className="iv-scard__strip"
                    ref={isActive ? stripRef : undefined}
                    style={{ transform: `translate3d(${-k * 100}%, 0, 0)` }}
                  >
                    {r.photos.map((p, j) => (
                      <img
                        key={p.id}
                        className="iv-scard__img"
                        src={p.src}
                        alt={`${r.userName}'s photo ${j + 1}`}
                        draggable={false}
                        style={isActive && j === k ? { viewTransitionName: MORPH_NAME } : undefined}
                      />
                    ))}
                  </div>
                  <div className="iv-scard__scrim" />
                  <div className="iv-scard__content">
                    {r.photos.length > 1 && (
                      <div className="iv-progress" aria-hidden>
                        {r.photos.map((p, j) => (
                          <span key={p.id} className={j <= k ? 'iv-progress__seg iv-progress__seg--filled' : 'iv-progress__seg'} />
                        ))}
                      </div>
                    )}
                    <div className="iv-scard__titlerow">
                      <span className="iv-spill">
                        {r.rating}
                        <img src="/assets/iv-star-white.svg" width={12} height={12} alt="" />
                      </span>
                      <h2 className="iv-scard__title">{r.title}</h2>
                    </div>
                    {showMore && isActive ? (
                      <>
                        <p className="iv-scard__body">{r.fullBody.split('\n')[0]}</p>
                        <div className="iv-scard__chips">
                          <span className="iv-scard__chips-label">Bought:</span>
                          {variantChips.map((chip) => (
                            <span key={chip} className="iv-scard__chip">
                              {chip}
                            </span>
                          ))}
                        </div>
                        <button className="iv-scard__toggle" onClick={() => setShowMore(false)}>
                          show less ⌃
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="iv-scard__body iv-scard__body--clamp">{r.body}</p>
                        <button className="iv-scard__toggle" onClick={() => setShowMore(true)}>
                          show more ⌄
                        </button>
                      </>
                    )}
                    <div className="iv-scard__reviewer">
                      {r.userName}
                      <img src="/assets/iv-check.svg" width={14} height={14} alt="Verified" />
                      <i>·</i>
                      {r.timeAgo}
                    </div>
                  </div>
                  <div className="iv-scard__actions">
                    <button aria-label="Like">
                      <img src="/assets/iv-like.svg" width={24} height={24} alt="" />
                    </button>
                    <button aria-label="Share" onClick={share}>
                      <img src="/assets/iv-share.svg" width={24} height={24} alt="" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Product quick view tray */}
      <footer className="iv-quickview">
        <div className="iv-quickview__card">
          <img className="iv-quickview__thumb" src={product.thumb} alt="" />
          <div className="iv-quickview__info">
            <p className="iv-quickview__name">{product.name}</p>
            <p className="iv-quickview__price">
              <b>Đ{product.price}</b> <s>{product.oldPrice}</s> <span>47%</span>
            </p>
          </div>
          <button className="iv-quickview__atc">Add to cart</button>
        </div>
      </footer>
    </div>
  )
}
