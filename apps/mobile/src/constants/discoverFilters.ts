import { CUSTOMER_CUISINE_FILTERS } from '../lib/cuisineMenu';

/** How to sort / highlight restaurants (Uber Eats / DoorDash style). */
export const BROWSE_FILTERS = [
  { id: 'all', label: 'All', icon: 'grid-outline' as const },
  { id: 'top_rated', label: 'Top rated', icon: 'star' as const },
  { id: 'most_reviewed', label: 'Most popular', icon: 'flame' as const },
  { id: 'featured', label: 'Featured', icon: 'ribbon-outline' as const },
  { id: 'open_now', label: 'Open now', icon: 'time-outline' as const },
  { id: 'fast_delivery', label: 'Fastest delivery', icon: 'bicycle-outline' as const },
];

/** Home screen Discover row — Top rated, Open now, Fastest, Featured. */
export const HOME_DISCOVER_FILTERS = BROWSE_FILTERS.filter((f) =>
  ['top_rated', 'open_now', 'fast_delivery', 'featured'].includes(f.id),
);

/** Customer cuisine filters — African covers Local (same menu section). */
export const CUISINE_FILTERS = [
  { id: 'all', label: 'All cuisines', emoji: '🍽️' },
  ...CUSTOMER_CUISINE_FILTERS.map((c) => ({
    id: c.id,
    label: c.label,
    emoji: c.emoji,
  })),
];

export const SORT_OPTIONS = [
  { id: 'rating', label: 'Highest rated' },
  { id: 'reviews', label: 'Most reviewed' },
  { id: 'delivery', label: 'Quickest delivery' },
  { id: 'name', label: 'Name A–Z' },
];
