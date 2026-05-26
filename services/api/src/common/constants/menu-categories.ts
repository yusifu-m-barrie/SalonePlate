/**
 * Standard menu sections for restaurants.
 * `cuisineTags`: restaurant settings cuisine ids that enable this section (empty = always available).
 * African + Local both map to one section — no duplicate dropdown entries.
 */
export const MENU_CATEGORY_PRESETS = [
  { key: 'starters', name: 'Starters & Small Plates', sortOrder: 1, cuisineTags: [] as string[] },
  { key: 'soups-stews', name: 'Soups & Stews', sortOrder: 2, cuisineTags: [] },
  { key: 'rice-dishes', name: 'Rice Dishes', sortOrder: 3, cuisineTags: ['rice'] },
  {
    key: 'local-specialties',
    name: 'African & Local Specialties',
    sortOrder: 4,
    cuisineTags: ['african', 'local'],
  },
  { key: 'grilled-bbq', name: 'Grilled & BBQ', sortOrder: 5, cuisineTags: ['bbq'] },
  { key: 'fast-food', name: 'Fast Food & Snacks', sortOrder: 6, cuisineTags: ['fast'] },
  { key: 'european', name: 'European & Continental', sortOrder: 7, cuisineTags: ['european'] },
  { key: 'pizza', name: 'Pizza', sortOrder: 8, cuisineTags: ['pizza'] },
  { key: 'seafood', name: 'Seafood', sortOrder: 9, cuisineTags: ['bbq'] },
  { key: 'vegetarian', name: 'Vegetarian & Plant-Based', sortOrder: 10, cuisineTags: [] },
  { key: 'sides', name: 'Sides & Extras', sortOrder: 11, cuisineTags: [] },
  { key: 'drinks', name: 'Drinks & Beverages', sortOrder: 12, cuisineTags: ['drinks'] },
  { key: 'desserts', name: 'Desserts & Sweets', sortOrder: 13, cuisineTags: ['desserts'] },
  { key: 'combos', name: 'Combos & Meal Deals', sortOrder: 14, cuisineTags: [] },
  { key: 'breakfast', name: 'Breakfast & Brunch', sortOrder: 15, cuisineTags: [] },
  { key: 'kids', name: 'Kids Menu', sortOrder: 16, cuisineTags: [] },
] as const;

export type MenuCategoryPreset = (typeof MENU_CATEGORY_PRESETS)[number];
export type MenuCategoryPresetKey = MenuCategoryPreset['key'];

export const MENU_CATEGORY_KEYS = MENU_CATEGORY_PRESETS.map((c) => c.key);

/** Customer search / restaurant profile cuisine tags (matches discover filters). */
export const RESTAURANT_CUISINE_OPTIONS = [
  { id: 'african', label: 'African', menuHint: 'African & Local Specialties' },
  { id: 'local', label: 'Local', menuHint: 'African & Local Specialties' },
  { id: 'european', label: 'European', menuHint: 'European & Continental' },
  { id: 'fast', label: 'Fast food', menuHint: 'Fast Food & Snacks' },
  { id: 'rice', label: 'Rice dishes', menuHint: 'Rice Dishes' },
  { id: 'bbq', label: 'BBQ & grill', menuHint: 'Grilled & BBQ' },
  { id: 'pizza', label: 'Pizza', menuHint: 'Pizza' },
  { id: 'desserts', label: 'Desserts', menuHint: 'Desserts & Sweets' },
  { id: 'drinks', label: 'Drinks', menuHint: 'Drinks & Beverages' },
] as const;

export function presetsForRestaurantCuisines(cuisines: string[] | null | undefined): MenuCategoryPreset[] {
  const tags = new Set((cuisines ?? []).map((c) => c.toLowerCase().trim()).filter(Boolean));
  if (tags.size === 0) {
    return [...MENU_CATEGORY_PRESETS];
  }
  return MENU_CATEGORY_PRESETS.filter(
    (p) => p.cuisineTags.length === 0 || p.cuisineTags.some((t) => tags.has(t)),
  );
}

export function presetCategoryNamesForCuisines(cuisines: string[] | null | undefined): Set<string> {
  return new Set(presetsForRestaurantCuisines(cuisines).map((p) => p.name));
}

/** Customer browse filter id → restaurant profile tags (African includes Local). */
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

/** Canonical customer-facing cuisine chips (no separate Local — use African). */
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

export function normalizeCuisineFilterId(cuisineId?: string | null): string | null {
  if (!cuisineId || cuisineId === 'all') return null;
  if (cuisineId === 'local') return 'african';
  return cuisineId.toLowerCase().trim();
}

export function cuisineTagsForFilter(cuisineId: string): string[] {
  const key = normalizeCuisineFilterId(cuisineId) || cuisineId;
  return CUISINE_FILTER_ALIASES[key] ?? [key];
}

/** Menu section names shown when a customer picks a cuisine filter. */
export function menuCategoryNamesForCuisineFilter(cuisineId: string): string[] {
  const tags = new Set(cuisineTagsForFilter(cuisineId));
  return MENU_CATEGORY_PRESETS.filter((p) =>
    p.cuisineTags.length > 0 && p.cuisineTags.some((t) => tags.has(t)),
  ).map((p) => p.name);
}

export function normalizeMenuLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function menuLabelsMatch(a: string, b: string): boolean {
  const na = normalizeMenuLabel(a);
  const nb = normalizeMenuLabel(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function categoryNameMatchesCuisineFilter(
  categoryName: string,
  cuisineId: string,
): boolean {
  const sections = menuCategoryNamesForCuisineFilter(cuisineId);
  return sections.some((s) => menuLabelsMatch(categoryName, s));
}

export function inferCuisineTagsFromMenuCategoryNames(categoryNames: string[]): string[] {
  const tags = new Set<string>();
  for (const catName of categoryNames) {
    for (const preset of MENU_CATEGORY_PRESETS) {
      if (preset.cuisineTags.length && menuLabelsMatch(catName, preset.name)) {
        preset.cuisineTags.forEach((t) => tags.add(t));
      }
    }
  }
  return [...tags];
}
