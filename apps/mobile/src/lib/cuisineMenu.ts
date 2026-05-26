/**
 * Customer cuisine filters ↔ restaurant menu sections (aligned with API menu-categories).
 */

export const CUISINE_FILTER_ALIASES: Record<string, string[]> = {
  african: ['african', 'local'],
  local: ['african', 'local'],
  european: ['european'],
  fast: ['fast'],
  rice: ['rice'],
  bbq: ['bbq'],
  pizza: ['pizza'],
  desserts: ['desserts'],
  drinks: ['drinks'],
};

export const MENU_SECTION_BY_CUISINE: Record<string, string[]> = {
  african: ['African & Local Specialties'],
  local: ['African & Local Specialties'],
  european: ['European & Continental'],
  fast: ['Fast Food & Snacks'],
  rice: ['Rice Dishes'],
  bbq: ['Grilled & BBQ', 'Seafood'],
  pizza: ['Pizza'],
  desserts: ['Desserts & Sweets'],
  drinks: ['Drinks & Beverages'],
};

export const CUSTOMER_CUISINE_FILTERS = [
  { id: 'african', label: 'African', emoji: '🍲', menuSection: 'African & Local Specialties' },
  { id: 'european', label: 'European', emoji: '🍝', menuSection: 'European & Continental' },
  { id: 'fast', label: 'Fast food', emoji: '🍔', menuSection: 'Fast Food & Snacks' },
  { id: 'rice', label: 'Rice dishes', emoji: '🍚', menuSection: 'Rice Dishes' },
  { id: 'bbq', label: 'BBQ & grill', emoji: '🍖', menuSection: 'Grilled & BBQ' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕', menuSection: 'Pizza' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰', menuSection: 'Desserts & Sweets' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤', menuSection: 'Drinks & Beverages' },
] as const;

export type CustomerCuisineId = (typeof CUSTOMER_CUISINE_FILTERS)[number]['id'];

export function normalizeMenuLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function menuLabelsMatch(a: string, b: string): boolean {
  const na = normalizeMenuLabel(a);
  const nb = normalizeMenuLabel(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function normalizeCuisineFilterId(cuisineId?: string | null): string | null {
  if (!cuisineId || cuisineId === 'all') return null;
  if (cuisineId === 'local') return 'african';
  return cuisineId.toLowerCase().trim();
}

export function cuisineTagsForFilter(cuisineId: string): string[] {
  const key = normalizeCuisineFilterId(cuisineId) || cuisineId;
  return CUISINE_FILTER_ALIASES[key] ?? [key];
}

export function menuSectionNamesForCuisine(cuisineId: string): string[] {
  const key = normalizeCuisineFilterId(cuisineId) || cuisineId;
  return MENU_SECTION_BY_CUISINE[key] ?? [];
}

/** Infer profile cuisine tags from menu category names (when owner has not set tags yet). */
export function inferCuisineTagsFromMenuCategoryNames(categoryNames: string[]): string[] {
  const tags = new Set<string>();
  for (const catName of categoryNames) {
    for (const filter of CUSTOMER_CUISINE_FILTERS) {
      const sections = menuSectionNamesForCuisine(filter.id);
      if (sections.some((s) => menuLabelsMatch(catName, s))) {
        cuisineTagsForFilter(filter.id).forEach((t) => tags.add(t));
      }
    }
  }
  return [...tags];
}

export function categoryMatchesCuisineFilter(categoryName: string, cuisineId: string): boolean {
  const sections = menuSectionNamesForCuisine(cuisineId);
  return sections.some((s) => menuLabelsMatch(categoryName, s));
}

/** Cuisine chips to show on a restaurant (no duplicate Local when African applies). */
export function cuisinesForRestaurant(profileTags: string[] | null | undefined) {
  const tags = new Set((profileTags ?? []).map((t) => t.toLowerCase()));
  return CUSTOMER_CUISINE_FILTERS.filter((f) =>
    cuisineTagsForFilter(f.id).some((t) => tags.has(t)),
  );
}

/**
 * Filters shown on restaurant page — only cuisines that have dishes on this menu.
 */
export function cuisineFiltersForRestaurant(
  profileTags: string[] | null | undefined,
  menuCategories: { name: string; items?: { tags?: string[] }[] }[],
) {
  const activeCategories = menuCategories.filter((c) => (c.items?.length ?? 0) > 0);
  if (activeCategories.length === 0) return [];

  const profile = new Set((profileTags ?? []).map((t) => t.toLowerCase()));
  inferCuisineTagsFromMenuCategoryNames(activeCategories.map((c) => c.name)).forEach((t) =>
    profile.add(t),
  );

  return CUSTOMER_CUISINE_FILTERS.filter((f) => {
    const sections = menuSectionNamesForCuisine(f.id);
    const hasCategoryMatch = activeCategories.some((cat) =>
      sections.some((s) => menuLabelsMatch(cat.name, s)),
    );
    if (hasCategoryMatch) return true;

    const tags = cuisineTagsForFilter(f.id);
    return activeCategories.some((cat) =>
      (cat.items ?? []).some((item) =>
        (item.tags ?? []).some((t) => tags.includes(t.toLowerCase())),
      ),
    );
  });
}

export function displayCuisineLabel(tag: string): string {
  const id = normalizeCuisineFilterId(tag) || tag;
  return CUSTOMER_CUISINE_FILTERS.find((f) => f.id === id)?.label ?? tag.replace(/_/g, ' ');
}

export function filterMenuCategoriesByCuisine<
  T extends { name: string; items?: { tags?: string[] }[] },
>(categories: T[], cuisineId: string | null): T[] {
  if (!cuisineId) return categories;
  const cuisineTags = new Set(cuisineTagsForFilter(cuisineId));

  return categories
    .map((cat) => {
      const categoryMatches = categoryMatchesCuisineFilter(cat.name, cuisineId);
      const items = (cat.items ?? []).filter((item) => {
        if (categoryMatches) return true;
        return (item.tags ?? []).some((t) => cuisineTags.has(t.toLowerCase()));
      });
      return { ...cat, items };
    })
    .filter((cat) => (cat.items?.length ?? 0) > 0);
}

/** Cover: banner → logo → first menu photo. */
export function pickRestaurantHeroImage(restaurant: {
  coverImage?: string | null;
  logoUrl?: string | null;
  menuCategories?: { items?: { imageUrl?: string | null }[] }[];
  menuItems?: { imageUrl?: string | null }[];
}): string | undefined {
  if (restaurant.coverImage) return restaurant.coverImage;
  if (restaurant.logoUrl) return restaurant.logoUrl;
  for (const cat of restaurant.menuCategories ?? []) {
    for (const item of cat.items ?? []) {
      if (item.imageUrl) return item.imageUrl;
    }
  }
  for (const item of restaurant.menuItems ?? []) {
    if (item.imageUrl) return item.imageUrl;
  }
  return undefined;
}

/** Tags shown on home/search cards (profile tags or inferred from menu). */
export function restaurantCardCuisineTags(
  profileCategories?: string[] | null,
  displayCategories?: string[] | null,
) {
  const ids =
    (displayCategories?.length ? displayCategories : profileCategories) ?? [];
  const chips = cuisinesForRestaurant(ids);
  if (chips.length > 0) return chips;
  return ids.slice(0, 3).map((id) => ({
    id,
    label: displayCuisineLabel(id),
    emoji: '🍽️',
    menuSection: '',
  }));
}

export function restaurantDisplayDescription(description?: string | null): string {
  const trimmed = description?.trim();
  if (trimmed) return trimmed;
  return 'Browse our menu and order your favourites for delivery.';
}
