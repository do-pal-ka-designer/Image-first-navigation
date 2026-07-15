import { useNavigate } from 'react-router-dom'
import { product, ratingDistribution, reviews } from '../data/product'
import { useMorphReturnScroll } from '../lib/morph'
import Stars from '../components/Stars'
import AISummary from '../components/AISummary'
import PhotoReviews from '../components/PhotoReviews'
import ReviewCard from '../components/ReviewCard'
import AtcBar from '../components/AtcBar'
import { BackIcon } from '../components/icons'
import './PRP.css'

export default function PRP() {
  const navigate = useNavigate()
  useMorphReturnScroll()

  return (
    <div className="app-shell prp">
      {/* Header */}
      <header className="prp-header">
        <button className="icon-btn" aria-label="Back" onClick={() => navigate('/')}>
          <BackIcon />
        </button>
        <button className="prp-header__product" onClick={() => navigate('/')}>
          <img src={product.thumb} alt="" />
          <span className="prp-header__text">
            <b>Product Reviews</b>
            <small>{product.shortName}</small>
          </span>
        </button>
      </header>

      <main className="prp-body">
        {/* Review details: score + distribution */}
        <section className="prp-details">
          <div className="prp-summary">
            <div className="prp-summary__score">
              <span className="prp-summary__value">{product.prpRating}</span>
              <Stars rating={5} size={24} />
              <p className="prp-summary__source">
                {product.totalReviews} ratings from trusted sources{' '}
                <img src="/assets/info-circle.svg" width={12} height={12} alt="" />
              </p>
            </div>
            <div className="prp-summary__divider" />
            <div className="prp-summary__bars">
              {ratingDistribution.map(({ stars, pct, color }) => (
                <div key={stars} className="prp-bar">
                  <span className="prp-bar__label">{stars} star</span>
                  <span className="prp-bar__track">
                    <span className="prp-bar__fill" style={{ width: `${pct}%`, background: color }} />
                  </span>
                  <span className="prp-bar__pct">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <AISummary />

          {/* Entry point #2 into the image-first view */}
          <PhotoReviews source="prp" />
        </section>

        {/* All reviews */}
        <section className="prp-all">
          <div className="prp-all__head">
            <h3 className="section-title">All Reviews ({product.totalReviews})</h3>
            <button className="prp-translate-all">
              <img src="/assets/lucide-languages.svg" width={16} height={16} alt="" />
              Translate all reviews
            </button>
          </div>
          <div className="prp-all__list">
            {reviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} source="prp" compactHeader={i === 0} />
            ))}
          </div>
        </section>
      </main>

      <AtcBar />
    </div>
  )
}
