export interface ReviewPhoto {
  id: string
  src: string
  /** per-image review shown in the image-first view (each photo is its own entry) */
  userName?: string
  rating?: number
  timeAgo?: string
  title?: string
  body?: string
}

export interface StripPhoto extends ReviewPhoto {
  /** review this photo belongs to, for the image-first view */
  reviewId: string
  photoIndex: number
}

export interface Review {
  id: string
  userName: string
  rating: number
  timeAgo: string
  verified: boolean
  fromTrustedSource: boolean
  title: string
  body: string
  fullBody: string
  chips: string[]
  variantInfo: string
  photos: ReviewPhoto[]
  helpfulCount: number
  helpfulSelected: boolean
}

export const product = {
  brand: 'Anker',
  name: 'Men Youth Digital Watch AE-1200WHD-1A - 42 mm - Silver Stainless Steel',
  shortName: 'Men Youth Digital Watch AE-1200WHD-1A - 42 mm - Silver',
  rating: 4.3,
  reviewsCount: 126,
  price: 109,
  oldPrice: 209,
  discount: '47% OFF',
  avgRating: 4.8,
  prpRating: 4.75,
  totalReviews: 64,
  heroImage: '/assets/pdp-hero.png',
  thumb: '/assets/pdp-hero.png',
}

export const ratingDistribution = [
  { stars: 5, pct: 55, color: 'var(--positive-secondary)' },
  { stars: 4, pct: 25, color: 'var(--positive-secondary)' },
  { stars: 3, pct: 3, color: 'var(--positive)' },
  { stars: 2, pct: 2, color: 'var(--brand-secondary)' },
  { stars: 1, pct: 15, color: 'var(--warning)' },
]

export const aiHighlights = [
  'The portrait mode includes a fantastic wide-angle',
  'Users appreciate the overall performance of phone.',
  'Enjoy the wide-angle capability while using portrait a fantastic wide-angle',
  'Users appreciate the overall performance of this phone.',
]

export const photoReviews: StripPhoto[] = [
  { id: 'p1', src: '/assets/watch-couch.png', reviewId: 'r1', photoIndex: 0 },
  { id: 'p2', src: '/assets/watch-wrist-dxb.png', reviewId: 'r1', photoIndex: 1 },
  { id: 'p3', src: '/assets/watch-box-amber.png', reviewId: 'r1', photoIndex: 2 },
  { id: 'p4', src: '/assets/watch-wrist-tag.png', reviewId: 'r2', photoIndex: 0 },
  { id: 'p5', src: '/assets/watch-box-blue.png', reviewId: 'r3', photoIndex: 0 },
  { id: 'p6', src: '/assets/watch-box-hand.png', reviewId: 'r4', photoIndex: 0 },
]

const reviewChips = ['Mac OS', '8 GB RAM', 'Internal Version', '256 GB', 'Dual core memory']

const longReviewBody = `The display is crisp and packed with useful info time, date, world time map, alarms and yet still easy to read. It has that retro-tech aesthetic that feels intentional rather than outdated.
One of its standout features: you can track multiple time zones easily, which is rare at this price point. Company gives around 10 years on a single battery, basically "set it and forget it. The display is crisp and packed with useful info time, date, world time map, alarms and yet still easy to read. It has that retro-tech aesthetic that feels intentional rather than outdated.
One of its standout features: you can track multiple time zones easily, which is rare at this price point. Company gives around 10 years on a single battery, basically "set it and forget it`

export const reviews: Review[] = [
  {
    // the major use case: one review carrying multiple images — its photos
    // scroll one by one in the image view, then the last card swipes into
    // the next review
    id: 'r1',
    userName: 'Aditya Birla',
    rating: 5,
    timeAgo: '4 months ago',
    verified: true,
    fromTrustedSource: false,
    title: 'Great quality and built',
    body: 'Really happy with this Casio new tech watch. It looks great on the desk, on the wrist and the backlight is superb at night.',
    fullBody: longReviewBody,
    chips: reviewChips,
    variantInfo: 'Bought 42 mm, Silver, Manual',
    photos: [
      { id: 'r1p1', src: '/assets/watch-couch.png' },
      { id: 'r1p2', src: '/assets/watch-wrist-dxb.png' },
      { id: 'r1p3', src: '/assets/watch-box-amber.png' },
    ],
    helpfulCount: 15,
    helpfulSelected: true,
  },
  {
    id: 'r2',
    userName: 'David Chen',
    rating: 4,
    timeAgo: '3 months ago',
    verified: true,
    fromTrustedSource: false,
    title: 'Solid build quality',
    body: 'Feels reassuringly solid for a digital watch at this price. Tag still on in the photo — first impression out of the box was great, buttons are clicky and the strap adjusts easily.',
    fullBody:
      'Feels reassuringly solid for a digital watch at this price. Tag still on in the photo — first impression out of the box was great, buttons are clicky and the strap adjusts easily.\nAfter a week of daily wear there is not a single scratch on the case, and the module keeps perfect time against my phone.',
    chips: reviewChips,
    variantInfo: 'Bought 42 mm, Silver, Manual',
    photos: [{ id: 'r2p1', src: '/assets/watch-wrist-tag.png' }],
    helpfulCount: 9,
    helpfulSelected: false,
  },
  {
    id: 'r3',
    userName: 'Aisha Khan',
    rating: 5,
    timeAgo: '5 months ago',
    verified: false,
    fromTrustedSource: true,
    title: 'Exactly as described',
    body: 'Exactly what was pictured on the listing, no surprises. The blue tint on the display is subtle and classy. Would happily buy again as a gift.',
    fullBody:
      'Exactly what was pictured on the listing, no surprises. The blue tint on the display is subtle and classy. Would happily buy again as a gift.\nDelivery was quick and the box arrived undamaged — the presentation makes it very giftable.',
    chips: reviewChips,
    variantInfo: 'Bought 42 mm, Silver, Manual',
    photos: [{ id: 'r3p1', src: '/assets/watch-box-blue.png' }],
    helpfulCount: 6,
    helpfulSelected: false,
  },
  {
    id: 'r4',
    userName: 'Tom Wright',
    rating: 3,
    timeAgo: '6 months ago',
    verified: true,
    fromTrustedSource: false,
    title: 'Good, but strap took work',
    body: 'The watch itself is great value and looks sharp. Knocked a star because sizing the metal strap was fiddly and I had to take it to a shop to remove links.',
    fullBody:
      'The watch itself is great value and looks sharp. Knocked a star because sizing the metal strap was fiddly and I had to take it to a shop to remove links.\nOnce sized properly it wears comfortably, so factor in a small extra cost for strap adjustment.',
    chips: reviewChips,
    variantInfo: 'Bought 42 mm, Silver, Manual',
    photos: [{ id: 'r4p1', src: '/assets/watch-box-hand.png' }],
    helpfulCount: 4,
    helpfulSelected: false,
  },
]
