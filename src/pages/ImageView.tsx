import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { photoReviews, product, reviews, type Review, type ReviewPhoto } from '../data/product'
import { MORPH_NAME, getMorphSource, setMorphSource, withLocalTransition } from '../lib/morph'
import './ImageView.css'

interface Slide {
  review: Review
  photo: ReviewPhoto
  globalIndex: number
}

/** one continuous swipe stream across every review's photos */
const slides: Slide[] = reviews.flatMap((review) => review.photos.map((photo) => ({ review, photo, globalIndex: 0 })))
slides.forEach((slide, i) => (slide.globalIndex = i))

function slideIndexFor(reviewId: string | null, photoIndex: number): number {
  const first = slides.findIndex((s) => s.review.id === reviewId)
  if (first === -1) return 0
  return Math.min(first + photoIndex, slides.length - 1)
}

/**
 * Image-first view ("Single Review") — reached by tapping any review
 * photo on the PDP or PRP. The tapped thumbnail morphs into the main
 * image card via the View Transitions API.
 */
export default function ImageView() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [active, setActive] = useState(() =>
    slideIndexFor(params.get('review'), Number(params.get('photo') ?? 0)),
  )
  const [expanded, setExpanded] = useState(false)
  const [pagerOpen, setPagerOpen] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ startX: 0, startLeft: 0, active: false, moved: false })

  const review = slides[active].review

  // position the carousel on the tapped photo (before paint; snap disabled so
  // Chrome doesn't animate the initial jump)
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.style.scrollSnapType = 'none'
    const position = () => {
      el.scrollLeft = active * el.clientWidth
    }
    position()
    requestAnimationFrame(() => {
      position()
      requestAnimationFrame(() => {
        el.style.scrollSnapType = ''
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const el = trackRef.current
    if (!el || drag.current.active || expanded || pagerOpen) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== active && idx >= 0 && idx < slides.length) setActive(idx)
  }

  // mouse drag-to-swipe (touch swiping is native via scroll-snap)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = trackRef.current
    if (!el) return
    drag.current = { startX: e.clientX, startLeft: el.scrollLeft, active: true, moved: false }
    el.style.scrollSnapType = 'none'
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (!el || !drag.current.active) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 5) drag.current.moved = true
    el.scrollLeft = drag.current.startLeft - dx
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (!el || !drag.current.active) return
    drag.current.active = false
    el.releasePointerCapture(e.pointerId)
    // snap to the nearest card, biased by drag direction
    const dx = e.clientX - drag.current.startX
    const raw = el.scrollLeft / el.clientWidth
    const target = Math.abs(dx) > 40 ? (dx < 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw)
    const idx = Math.max(0, Math.min(slides.length - 1, target))
    setActive(idx)
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
    window.setTimeout(() => {
      el.style.scrollSnapType = ''
    }, 350)
  }

  const suppressDragClick = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = false
    }
  }

  /* expand / collapse: the card morphs into (out of) the pager's active thumbnail */
  const toggleExpanded = (next: boolean) => {
    withLocalTransition(() => flushSync(() => setExpanded(next)))
  }

  /* gallery modal: the pill morphs into a grid of all photos and back */
  const toggleGallery = (next: boolean) => {
    withLocalTransition(() => flushSync(() => setPagerOpen(next)))
  }

  const selectFromGallery = (i: number) => {
    const el = trackRef.current
    // snap must stay off until the morph settles, or Chrome re-snaps to the
    // old position mid-transition and undoes the selection
    if (el) el.style.scrollSnapType = 'none'
    withLocalTransition(() =>
      flushSync(() => {
        setPagerOpen(false)
        setActive(i)
        if (el) el.scrollLeft = i * el.clientWidth
      }),
    )
    window.setTimeout(() => {
      if (el) {
        el.scrollLeft = i * el.clientWidth
        el.style.scrollSnapType = ''
      }
    }, 500)
  }

  // open the OS share sheet for the active photo; fall back to copying the URL
  const share = async () => {
    const slide = slides[active]
    const url = new URL(window.location.href)
    url.searchParams.set('review', slide.review.id)
    url.searchParams.set('photo', String(slide.review.photos.indexOf(slide.photo)))
    const data = {
      title: product.name,
      text: `${slide.review.userName}'s review of ${product.name}`,
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
    // retarget the reverse morph at the photo currently on screen, so the
    // image scales back down into that photo's thumbnail on the source page
    const slide = slides[active]
    if (source.key.startsWith('strip-')) {
      const localIndex = slide.review.photos.indexOf(slide.photo)
      const strip = photoReviews.find((p) => p.reviewId === slide.review.id && p.photoIndex === localIndex)
      if (strip) setMorphSource(`strip-${strip.id}`, source.path)
    } else {
      setMorphSource(`card-${slide.photo.id}`, source.path)
    }
    navigate(source.path, { viewTransition: true, state: { fromImageView: true } })
  }

  const prevSlide = active > 0 ? slides[active - 1] : null
  const nextSlide = active < slides.length - 1 ? slides[active + 1] : null

  return (
    <div className="app-shell iv">
      {/* Review header — content keyed by review so it animates on change */}
      <header className={expanded ? 'iv-header iv-header--expanded' : 'iv-header'}>
        <div className="iv-header__content" key={review.id}>
          <div className="iv-header__user">
            <span className="iv-avatar" aria-hidden>
              {review.userName
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span className="iv-header__user-info">
              <span className="iv-header__name">
                {review.userName}
                <img src="/assets/iv-check.svg" width={16} height={16} alt="Verified" />
              </span>
              <span className="iv-header__time">{review.timeAgo}</span>
            </span>
          </div>
          <div className="iv-header__review">
            <div className="iv-stars" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <img
                  key={i}
                  src={i <= Math.round(review.rating) ? '/assets/iv3-star.svg' : '/assets/pdp-star-16-empty.svg'}
                  width={20}
                  height={20}
                  alt=""
                />
              ))}
            </div>
            <h2 className="iv-header__title">{review.title}</h2>
            {expanded ? (
              <div className="iv-header__full">
                {review.fullBody.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
                <button className="iv-header__less" onClick={() => toggleExpanded(false)}>
                  Show less
                </button>
              </div>
            ) : (
              <div className="iv-header__excerpt">
                <p>{review.fullBody}</p>
                <button className="iv-header__more" onClick={() => toggleExpanded(true)}>
                  …more
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="iv-close" aria-label="Close" onClick={close}>
          <img src="/assets/iv-cross.svg" width={20} height={20} alt="" />
        </button>
      </header>

      {/* Swipeable image cards — one continuous stream across all reviews */}
      <div className="iv-stage">
        <div className={expanded ? 'iv-carousel-wrap iv-carousel-wrap--collapsed' : 'iv-carousel-wrap'}>
          <div
            className="iv-carousel"
            ref={trackRef}
            onScroll={onScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={suppressDragClick}
          >
            {slides.map((slide, i) => (
              <div key={slide.photo.id} className="iv-slide">
                <img
                  className="iv-card__img"
                  src={slide.photo.src}
                  alt={`Review photo ${i + 1}`}
                  draggable={false}
                  style={i === active && !expanded ? { viewTransitionName: MORPH_NAME } : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action bar: photo pager (left) + like / share (right) */}
        <div className={pagerOpen ? 'iv-actionbar iv-actionbar--pager-open' : 'iv-actionbar'}>
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
                  <img
                    src={slides[active].photo.src}
                    alt=""
                    style={expanded ? { viewTransitionName: MORPH_NAME } : undefined}
                  />
                </span>
                {nextSlide && (
                  <span className="iv-pager__thumb iv-pager__thumb--side iv-pager__thumb--next">
                    <img src={nextSlide.photo.src} alt="" />
                  </span>
                )}
              </span>
            </button>
          )}
          <div className="iv-actionbar__actions">
            <button className="iv-action" aria-label="Like">
              <img src="/assets/iv2-like.svg" width={24} height={24} alt="" />
            </button>
            <button className="iv-action" aria-label="Share" onClick={share}>
              <img src="/assets/iv2-share.svg" width={24} height={24} alt="" />
            </button>
          </div>
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
