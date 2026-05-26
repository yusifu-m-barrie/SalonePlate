import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RestaurantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  categoryNameMatchesCuisineFilter,
  cuisineTagsForFilter,
  CUSTOMER_CUISINE_FILTERS,
  inferCuisineTagsFromMenuCategoryNames,
  menuCategoryNamesForCuisineFilter,
  normalizeCuisineFilterId,
} from '../common/constants/menu-categories';
import { mapMenuItem, mapRestaurantMedia, resolveMediaUrl } from '../common/media-url';
import { haversineKm } from '../common/utils/geo';

const discoverFoodInclude = {
  category: { select: { name: true } },
  restaurant: {
    select: {
      id: true,
      name: true,
      slug: true,
      lat: true,
      lng: true,
      isOpen: true,
      isBusy: true,
      categories: true,
    },
  },
} as const;

type DiscoverFoodMenuItem = Prisma.MenuItemGetPayload<{
  include: typeof discoverFoodInclude;
}>;

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  /** Average food rating per menu item from delivered orders that included that dish. */
  private async menuItemRatingStats(restaurantId: string, itemIds: string[]) {
    const stats = new Map<string, { avgRating: number; ratingCount: number }>();
    if (itemIds.length === 0) return stats;

    const itemIdSet = new Set(itemIds);
    const rows = await this.prisma.orderItem.findMany({
      where: {
        menuItemId: { in: itemIds },
        order: { restaurantId, review: { isNot: null } },
      },
      select: {
        menuItemId: true,
        orderId: true,
        order: {
          select: {
            review: { select: { foodRating: true, rating: true } },
            items: { select: { menuItemId: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    const acc = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const key = `${row.orderId}:${row.menuItemId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const review = row.order.review;
      if (!review) continue;

      const dishesInOrder = [
        ...new Set(row.order.items.map((i) => i.menuItemId).filter((id) => itemIdSet.has(id))),
      ];
      if (!dishesInOrder.includes(row.menuItemId)) continue;

      // Single-dish orders: rating applies to that food. Multi-dish: only when food was rated explicitly.
      const score =
        review.foodRating ??
        (dishesInOrder.length === 1 ? review.rating : null);
      if (score == null) continue;

      const cur = acc.get(row.menuItemId) ?? { sum: 0, count: 0 };
      cur.sum += score;
      cur.count += 1;
      acc.set(row.menuItemId, cur);
    }

    for (const [id, { sum, count }] of acc) {
      stats.set(id, { avgRating: Math.round((sum / count) * 10) / 10, ratingCount: count });
    }
    return stats;
  }

  /** Food ratings for many menu items across a city (discover popular foods). */
  private async menuItemRatingStatsForItems(cityId: string, itemIds: string[]) {
    const stats = new Map<string, { avgRating: number; ratingCount: number }>();
    if (itemIds.length === 0) return stats;

    const itemIdSet = new Set(itemIds);
    const rows = await this.prisma.orderItem.findMany({
      where: {
        menuItemId: { in: itemIds },
        order: { restaurant: { cityId }, review: { isNot: null } },
      },
      select: {
        menuItemId: true,
        orderId: true,
        order: {
          select: {
            review: { select: { foodRating: true, rating: true } },
            items: { select: { menuItemId: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    const acc = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const key = `${row.orderId}:${row.menuItemId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const review = row.order.review;
      if (!review) continue;

      const dishesInOrder = [
        ...new Set(row.order.items.map((i) => i.menuItemId).filter((id) => itemIdSet.has(id))),
      ];
      if (!dishesInOrder.includes(row.menuItemId)) continue;

      const score =
        review.foodRating ?? (dishesInOrder.length === 1 ? review.rating : null);
      if (score == null) continue;

      const cur = acc.get(row.menuItemId) ?? { sum: 0, count: 0 };
      cur.sum += score;
      cur.count += 1;
      acc.set(row.menuItemId, cur);
    }

    for (const [id, { sum, count }] of acc) {
      stats.set(id, { avgRating: Math.round((sum / count) * 10) / 10, ratingCount: count });
    }
    return stats;
  }

  private withDistanceKm<T extends { lat?: number | null; lng?: number | null }>(
    rows: T[],
    userLat: number,
    userLng: number,
  ): (T & { distanceKm: number | null })[] {
    return rows.map((r) => ({
      ...r,
      distanceKm:
        typeof r.lat === 'number' && typeof r.lng === 'number'
          ? Math.round(haversineKm({ lat: userLat, lng: userLng }, { lat: r.lat, lng: r.lng }) * 10) /
            10
          : null,
    }));
  }

  private sortByDistance<T extends { distanceKm?: number | null }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }

  private readonly discoverFoodInclude = discoverFoodInclude;

  private mapDiscoverFoodRows(
    items: DiscoverFoodMenuItem[],
    ratingStats: Map<string, { avgRating: number; ratingCount: number }>,
    lat?: number,
    lng?: number,
  ) {
    const hasUserLocation =
      typeof lat === 'number' && !Number.isNaN(lat) && typeof lng === 'number' && !Number.isNaN(lng);

    return items.map((item) => {
      const s = ratingStats.get(item.id);
      const restaurant = item.restaurant;
      let distanceKm: number | null = null;
      if (
        hasUserLocation &&
        typeof restaurant.lat === 'number' &&
        typeof restaurant.lng === 'number'
      ) {
        distanceKm =
          Math.round(haversineKm({ lat, lng }, { lat: restaurant.lat, lng: restaurant.lng }) * 10) /
          10;
      }
      return {
        ...mapMenuItem(item),
        isFeatured: item.isFeatured,
        isPopular: item.isPopular,
        avgRating: s?.avgRating ?? null,
        ratingCount: s?.ratingCount ?? 0,
        categoryName: item.category?.name ?? 'Menu',
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          isOpen: restaurant.isOpen,
          isBusy: restaurant.isBusy,
          distanceKm,
        },
      };
    });
  }

  private sortDiscoverFoodRows<T extends { isPopular: boolean; restaurant: { distanceKm: number | null }; avgRating: number | null }>(
    rows: T[],
  ): T[] {
    return [...rows].sort((a, b) => {
      if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
      const da = a.restaurant.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.restaurant.distanceKm ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.avgRating ?? 0) - (a.avgRating ?? 0);
    });
  }

  /** Home discover: one rating query for popular + featured lists. */
  private async fetchDiscoverFoodsForHome(cityId: string, opts: { lat?: number; lng?: number }) {
    const baseWhere = {
      isAvailable: true,
      restaurant: { cityId, status: RestaurantStatus.APPROVED },
    };

    const [popularItems, featuredItems] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: baseWhere,
        include: this.discoverFoodInclude,
        orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
        take: 36,
      }),
      this.prisma.menuItem.findMany({
        where: { ...baseWhere, isFeatured: true },
        include: this.discoverFoodInclude,
        orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
        take: 12,
      }),
    ]);

    const allIds = [...new Set([...popularItems, ...featuredItems].map((i) => i.id))];
    const ratingStats =
      allIds.length > 0 ? await this.menuItemRatingStatsForItems(cityId, allIds) : new Map();

    const popularFoods = this.sortDiscoverFoodRows(
      this.mapDiscoverFoodRows(popularItems, ratingStats, opts.lat, opts.lng),
    ).slice(0, 30);

    const featuredFoods = this.sortDiscoverFoodRows(
      this.mapDiscoverFoodRows(featuredItems, ratingStats, opts.lat, opts.lng),
    ).slice(0, 12);

    return { popularFoods, featuredFoods };
  }

  private async fetchDiscoverFoods(
    cityId: string,
    opts: { lat?: number; lng?: number; limit?: number; featuredOnly?: boolean },
  ) {
    const limit = Math.min(opts.limit ?? 30, 48);
    const items = await this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        ...(opts.featuredOnly ? { isFeatured: true } : {}),
        restaurant: { cityId, status: RestaurantStatus.APPROVED },
      },
      include: this.discoverFoodInclude,
      orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
      take: opts.featuredOnly ? limit : Math.min(limit * 2, 48),
    });

    if (items.length === 0) return [];

    const ratingStats = await this.menuItemRatingStatsForItems(
      cityId,
      items.map((i) => i.id),
    );

    return this.sortDiscoverFoodRows(
      this.mapDiscoverFoodRows(items, ratingStats, opts.lat, opts.lng),
    ).slice(0, limit);
  }

  private mapMenuCategoriesWithStats<
    T extends {
      id: string;
      name: string;
      items: {
        id: string;
        isPopular: boolean;
        imageUrl: string | null;
        galleryUrls: string[];
        [key: string]: unknown;
      }[];
    },
  >(categories: T[], ratingStats: Map<string, { avgRating: number; ratingCount: number }>) {
    return categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => {
        const s = ratingStats.get(item.id);
        return {
          ...mapMenuItem(item),
          avgRating: s?.avgRating ?? null,
          ratingCount: s?.ratingCount ?? 0,
          isPopular: item.isPopular,
        };
      }),
    }));
  }

  private async enrichWithDisplayCategories<
    T extends { id: string; categories: string[] },
  >(rows: T[]): Promise<(T & { displayCategories: string[] })[]> {
    if (rows.length === 0) return [];

    const menuCats = await this.prisma.menuCategory.findMany({
      where: {
        restaurantId: { in: rows.map((r) => r.id) },
        isActive: true,
      },
      select: { restaurantId: true, name: true },
    });

    const namesByRestaurant = new Map<string, string[]>();
    for (const row of menuCats) {
      const list = namesByRestaurant.get(row.restaurantId) ?? [];
      list.push(row.name);
      namesByRestaurant.set(row.restaurantId, list);
    }

    return rows.map((r) => ({
      ...r,
      displayCategories:
        r.categories.length > 0
          ? r.categories
          : inferCuisineTagsFromMenuCategoryNames(namesByRestaurant.get(r.id) ?? []),
    }));
  }

  async discover(
    citySlug: string,
    query: {
      lat?: number;
      lng?: number;
      category?: string;
      cuisine?: string;
      search?: string;
      section?: string;
      sort?: string;
      restaurantId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const city = await this.prisma.city.findUnique({ where: { slug: citySlug } });
    if (!city) throw new NotFoundException('City not found');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 30, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.RestaurantWhereInput = {
      cityId: city.id,
      status: RestaurantStatus.APPROVED,
    };

    const cuisineRaw = query.cuisine || query.category;
    const cuisine = normalizeCuisineFilterId(cuisineRaw) || cuisineRaw;
    if (cuisine && cuisine !== 'all') {
      const tags = cuisineTagsForFilter(cuisine);
      const menuSectionNames = menuCategoryNamesForCuisineFilter(cuisine);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { categories: { hasSome: tags } },
            ...(menuSectionNames.length > 0
              ? [
                  {
                    menuCategories: {
                      some: {
                        isActive: true,
                        name: { in: menuSectionNames },
                        items: { some: { isAvailable: true } },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      ];
    }

    if (query.section === 'featured') {
      where.isFeatured = true;
    }
    if (query.section === 'open_now') {
      where.isOpen = true;
    }

    if (query.restaurantId) {
      where.id = query.restaurantId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const menuMatchIds = await this.prisma.menuItem.findMany({
        where: {
          isAvailable: true,
          name: { contains: term, mode: 'insensitive' },
          restaurant: { cityId: city.id, status: RestaurantStatus.APPROVED },
        },
        select: { restaurantId: true },
        distinct: ['restaurantId'],
      });
      const idsFromMenu = menuMatchIds.map((m) => m.restaurantId);
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        ...(idsFromMenu.length > 0 ? [{ id: { in: idsFromMenu } }] : []),
      ];
    }

    let orderBy: Prisma.RestaurantOrderByWithRelationInput = { rating: 'desc' };
    const sort = query.sort || (query.section === 'fast_delivery' ? 'delivery' : undefined);

    if (sort === 'reviews' || query.section === 'most_reviewed') {
      orderBy = { reviewCount: 'desc' };
    } else if (sort === 'delivery' || query.section === 'fast_delivery') {
      orderBy = { deliveryTimeMin: 'asc' };
    } else if (sort === 'name') {
      orderBy = { name: 'asc' };
    } else if (sort === 'rating' || query.section === 'top_rated') {
      orderBy = { rating: 'desc' };
    } else if (query.section === 'popular') {
      orderBy = { reviewCount: 'desc' };
    }

    const userLat = query.lat;
    const userLng = query.lng;
    const hasUserLocation =
      typeof userLat === 'number' &&
      !Number.isNaN(userLat) &&
      typeof userLng === 'number' &&
      !Number.isNaN(userLng);
    const useDistanceSort = hasUserLocation && (sort === 'distance' || !sort);

    const [restaurants, total, openCount] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          logoUrl: true,
          rating: true,
          reviewCount: true,
          deliveryTimeMin: true,
          deliveryTimeMax: true,
          deliveryFee: true,
          isOpen: true,
          isBusy: true,
          isFeatured: true,
          categories: true,
          minOrderAmount: true,
          lat: true,
          lng: true,
          description: true,
        },
      }),
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.count({
        where: { cityId: city.id, status: RestaurantStatus.APPROVED, isOpen: true },
      }),
    ]);

    const featured = await this.prisma.restaurant.findMany({
      where: { cityId: city.id, status: RestaurantStatus.APPROVED, isFeatured: true },
      take: 12,
      orderBy: { rating: 'desc' },
    });

    const banners = await this.prisma.banner.findMany({
      where: { OR: [{ cityId: city.id }, { cityId: null }], isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    });

    const mappedRestaurants = restaurants.map((r) => ({
      ...r,
      coverImage:
        resolveMediaUrl(r.coverImage) ?? resolveMediaUrl(r.logoUrl) ?? r.coverImage,
      logoUrl: resolveMediaUrl(r.logoUrl) ?? r.logoUrl,
    }));
    const mappedFeatured = featured.map((r) => ({
      ...r,
      coverImage:
        resolveMediaUrl(r.coverImage) ?? resolveMediaUrl(r.logoUrl) ?? r.coverImage,
      logoUrl: resolveMediaUrl(r.logoUrl) ?? r.logoUrl,
    }));

    let [enrichedRestaurants, enrichedFeatured] = await Promise.all([
      this.enrichWithDisplayCategories(mappedRestaurants),
      this.enrichWithDisplayCategories(mappedFeatured),
    ]);

    if (hasUserLocation) {
      enrichedRestaurants = this.sortByDistance(
        this.withDistanceKm(enrichedRestaurants, userLat!, userLng!),
      );
      enrichedFeatured = this.sortByDistance(
        this.withDistanceKm(enrichedFeatured, userLat!, userLng!),
      );
    }

    const foodOpts = {
      lat: hasUserLocation ? userLat : undefined,
      lng: hasUserLocation ? userLng : undefined,
    };
    const { popularFoods, featuredFoods } = await this.fetchDiscoverFoodsForHome(city.id, foodOpts);

    const pickerSource = await this.prisma.restaurant.findMany({
      where: { cityId: city.id, status: RestaurantStatus.APPROVED },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        coverImage: true,
        logoUrl: true,
        categories: true,
        isOpen: true,
      },
    });
    const restaurantPicker = await this.enrichWithDisplayCategories(
      pickerSource.map((r) => ({
        ...r,
        coverImage:
          resolveMediaUrl(r.coverImage) ?? resolveMediaUrl(r.logoUrl) ?? r.coverImage,
        logoUrl: resolveMediaUrl(r.logoUrl) ?? r.logoUrl,
      })),
    );

    return {
      restaurants: enrichedRestaurants,
      featured: enrichedFeatured,
      featuredRestaurants: enrichedFeatured,
      popularFoods,
      featuredFoods,
      restaurantPicker,
      locationSort: useDistanceSort,
      banners: banners.map((b) => ({
        ...b,
        imageUrl: resolveMediaUrl(b.imageUrl) ?? b.imageUrl,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        openCount,
        city: { name: city.name, slug: city.slug },
      },
      filters: {
        browse: ['all', 'top_rated', 'most_reviewed', 'featured', 'open_now', 'fast_delivery'],
        cuisines: CUSTOMER_CUISINE_FILTERS.map((c) => c.id),
      },
    };
  }

  async findBySlug(slug: string, cuisineFilter?: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        menuCategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { name: 'asc' },
              include: { variants: true, addons: true },
            },
          },
        },
        menuItems: {
          where: { isAvailable: true, categoryId: null },
          orderBy: { name: 'asc' },
          include: { variants: true, addons: true },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const activeCategoryNames = restaurant.menuCategories
      .filter((c) => c.items.length > 0)
      .map((c) => c.name);
    const effectiveCategories =
      restaurant.categories.length > 0
        ? restaurant.categories
        : inferCuisineTagsFromMenuCategoryNames(activeCategoryNames);

    const heroImage =
      resolveMediaUrl(restaurant.coverImage) ??
      resolveMediaUrl(restaurant.logoUrl) ??
      resolveMediaUrl(
        restaurant.menuCategories.flatMap((c) => c.items).find((i) => i.imageUrl)?.imageUrl,
      ) ??
      null;

    const displayDescription =
      restaurant.description?.trim() ||
      'Browse our menu and order your favourites for delivery.';

    const itemIds = [
      ...restaurant.menuCategories.flatMap((c) => c.items.map((i) => i.id)),
      ...restaurant.menuItems.map((i) => i.id),
    ];
    const ratingStats = await this.menuItemRatingStats(restaurant.id, itemIds);

    const mapCategories = (cats: typeof restaurant.menuCategories) =>
      this.mapMenuCategoriesWithStats(cats, ratingStats);

    const base = mapRestaurantMedia({
      ...restaurant,
      categories: effectiveCategories,
      coverImage: heroImage ?? restaurant.coverImage,
      description: displayDescription,
      menuCategories: mapCategories(restaurant.menuCategories),
      menuItems: restaurant.menuItems.map((item) => {
        const s = ratingStats.get(item.id);
        return {
          ...mapMenuItem(item),
          avgRating: s?.avgRating ?? null,
          ratingCount: s?.ratingCount ?? 0,
          isPopular: item.isPopular,
        };
      }),
    });

    const cuisine = normalizeCuisineFilterId(cuisineFilter);
    if (cuisine) {
      const cuisineTags = new Set(cuisineTagsForFilter(cuisine));
      const filteredCategories = restaurant.menuCategories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              categoryNameMatchesCuisineFilter(cat.name, cuisine) ||
              item.tags.some((t) => cuisineTags.has(t.toLowerCase())),
          ),
        }))
        .filter((cat) => cat.items.length > 0);

      return {
        ...base,
        menuCategories: mapCategories(filteredCategories),
        activeCuisineFilter: cuisine,
        heroImage,
        effectiveCategories,
      };
    }

    return { ...base, heroImage, effectiveCategories };
  }

  async toggleFavorite(userId: string, restaurantId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.favorite.create({ data: { userId, restaurantId } });
    return { favorited: true };
  }

  async findMenuItemById(itemId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: {
        id: itemId,
        isAvailable: true,
        restaurant: { status: RestaurantStatus.APPROVED },
      },
      include: {
        category: { select: { id: true, name: true } },
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isOpen: true,
            isBusy: true,
            rating: true,
            reviewCount: true,
            deliveryTimeMin: true,
            deliveryTimeMax: true,
            logoUrl: true,
            coverImage: true,
          },
        },
        variants: true,
        addons: true,
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    const ratingStats = await this.menuItemRatingStats(item.restaurantId, [item.id]);
    const s = ratingStats.get(item.id);
    const restaurant = item.restaurant;

    return {
      ...mapMenuItem(item),
      avgRating: s?.avgRating ?? null,
      ratingCount: s?.ratingCount ?? 0,
      categoryName: item.category?.name ?? 'Menu',
      categoryId: item.category?.id ?? null,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        isOpen: restaurant.isOpen,
        isBusy: restaurant.isBusy,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        deliveryTimeMin: restaurant.deliveryTimeMin,
        deliveryTimeMax: restaurant.deliveryTimeMax,
        coverImage:
          resolveMediaUrl(restaurant.coverImage) ??
          resolveMediaUrl(restaurant.logoUrl) ??
          restaurant.coverImage,
        logoUrl: resolveMediaUrl(restaurant.logoUrl) ?? restaurant.logoUrl,
      },
    };
  }

  async getTrendingMeals(citySlug: string, limit = 10) {
    const city = await this.prisma.city.findUnique({ where: { slug: citySlug } });
    if (!city) throw new NotFoundException('City not found');
    const items = await this.prisma.menuItem.findMany({
      where: {
        restaurant: { cityId: city.id, status: RestaurantStatus.APPROVED },
        isPopular: true,
        isAvailable: true,
      },
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
      take: limit,
    });
    return items.map((item) => mapMenuItem(item));
  }
}
