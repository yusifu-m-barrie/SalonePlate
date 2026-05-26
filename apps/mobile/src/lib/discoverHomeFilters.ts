import {
  categoryMatchesCuisineFilter,
  cuisineTagsForFilter,
  normalizeCuisineFilterId,
} from './cuisineMenu';

export type DiscoverRestaurantRow = {
  id: string;
  rating?: number;
  reviewCount?: number;
  deliveryTimeMin?: number;
  distanceKm?: number | null;
  isOpen?: boolean;
  isFeatured?: boolean;
  categories?: string[];
  displayCategories?: string[];
};

export type PopularFoodRow = {
  id: string;
  isPopular?: boolean;
  isFeatured?: boolean;
  avgRating?: number | null;
  categoryName?: string;
  restaurant: {
    id: string;
    isOpen?: boolean;
    distanceKm?: number | null;
  };
};

export type HomeFilterOptions = {
  featuredRestaurantIds?: Set<string>;
};

export type HomeDiscoverFilters = {
  restaurantId?: string | null;
  browse?: string;
  cuisine?: string;
};

function restaurantMatchesCuisine(r: DiscoverRestaurantRow, cuisineId: string): boolean {
  const tags = new Set(cuisineTagsForFilter(cuisineId));
  const profile = (r.categories ?? []).map((t) => t.toLowerCase());
  const display = (r.displayCategories ?? []).map((t) => t.toLowerCase());
  return profile.some((t) => tags.has(t)) || display.some((t) => tags.has(t));
}

/** Client-side discover filters for the home screen (instant, no tab navigation). */
export function applyHomeDiscoverFilters<T extends DiscoverRestaurantRow>(
  list: T[],
  filters: HomeDiscoverFilters,
  options?: HomeFilterOptions,
): T[] {
  let result = [...list];
  const browse = filters.browse && filters.browse !== 'all' ? filters.browse : null;
  const cuisine = normalizeCuisineFilterId(filters.cuisine);

  if (filters.restaurantId) {
    result = result.filter((r) => r.id === filters.restaurantId);
  }

  if (cuisine) {
    result = result.filter((r) => restaurantMatchesCuisine(r, cuisine));
  }

  if (browse === 'open_now') {
    result = result.filter((r) => r.isOpen !== false);
  } else if (browse === 'featured') {
    const featuredIds = options?.featuredRestaurantIds;
    result = result.filter(
      (r) =>
        r.isFeatured === true ||
        (featuredIds != null && featuredIds.size > 0 && featuredIds.has(r.id)),
    );
  }

  if (browse === 'top_rated') {
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (browse === 'most_reviewed') {
    result.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  } else if (browse === 'fast_delivery') {
    result.sort((a, b) => (a.deliveryTimeMin ?? 999) - (b.deliveryTimeMin ?? 999));
  } else if (!browse) {
    result.sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }

  return result;
}

/** Filter popular foods to match the same home discover chips. */
export function applyHomeDiscoverFiltersToFoods<T extends PopularFoodRow>(
  list: T[],
  filters: HomeDiscoverFilters,
): T[] {
  let result = [...list];
  const browse = filters.browse && filters.browse !== 'all' ? filters.browse : null;
  const cuisine = normalizeCuisineFilterId(filters.cuisine);

  if (filters.restaurantId) {
    result = result.filter((f) => f.restaurant.id === filters.restaurantId);
  }

  if (cuisine) {
    result = result.filter(
      (f) => f.categoryName && categoryMatchesCuisineFilter(f.categoryName, cuisine),
    );
  }

  if (browse === 'open_now') {
    result = result.filter((f) => f.restaurant.isOpen !== false);
  }

  if (browse === 'featured') {
    result = result.filter((f) => f.isFeatured === true);
  } else if (browse === 'top_rated') {
    result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  } else if (!browse) {
    result.sort((a, b) => {
      const da = a.restaurant.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.restaurant.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }

  return result;
}

export function hasActiveHomeDiscoverFilters(filters: HomeDiscoverFilters): boolean {
  return !!(
    filters.restaurantId ||
    (filters.browse && filters.browse !== 'all') ||
    (filters.cuisine && filters.cuisine !== 'all')
  );
}
