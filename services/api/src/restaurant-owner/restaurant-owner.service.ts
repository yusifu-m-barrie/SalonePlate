import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import {
  MENU_CATEGORY_PRESETS,
  presetCategoryNamesForCuisines,
  presetsForRestaurantCuisines,
} from '../common/constants/menu-categories';
import {
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from './dto/menu.dto';
import { UpdateOwnerOrderStatusDto } from './dto/order.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant.dto';
import { fromNleAmount } from '../common/utils/currency';
import { PromotionsService } from '../promotions/promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from '../promotions/dto/create-promotion.dto';
import { RevenuePeriod, RevenueQueryDto } from './dto/revenue-query.dto';

const OWNER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PLACED]: [OrderStatus.RESTAURANT_ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.RESTAURANT_ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.RIDER_ASSIGNED, OrderStatus.ON_THE_WAY, OrderStatus.CANCELLED],
  [OrderStatus.RIDER_ASSIGNED]: [OrderStatus.ON_THE_WAY, OrderStatus.CANCELLED],
};

@Injectable()
export class RestaurantOwnerService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private promotionsService: PromotionsService,
  ) {}

  private async getOwnedRestaurant(userId: string, restaurantId?: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: restaurantId ? { id: restaurantId, ownerId: userId } : { ownerId: userId },
      include: {
        city: { select: { name: true, slug: true } },
      },
    });
    if (!restaurant) {
      throw new NotFoundException('No restaurant linked to your account');
    }
    return restaurant;
  }

  private async dedupeMenuCategories(restaurantId: string) {
    const existing = await this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const byName = new Map<string, typeof existing>();
    for (const cat of existing) {
      const list = byName.get(cat.name) ?? [];
      list.push(cat);
      byName.set(cat.name, list);
    }
    for (const [, cats] of byName) {
      if (cats.length <= 1) continue;
      const [keep, ...dupes] = cats;
      for (const dup of dupes) {
        await this.prisma.menuCategory.update({
          where: { id: dup.id },
          data: { isActive: false },
        });
        await this.prisma.menuItem.updateMany({
          where: { categoryId: dup.id },
          data: { categoryId: keep.id },
        });
      }
    }
  }

  private async ensureMenuCategories(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { categories: true },
    });
    const cuisines = restaurant?.categories ?? [];
    const activePresets = presetsForRestaurantCuisines(cuisines);
    const allowedNames = new Set<string>(activePresets.map((p) => p.name));

    await this.dedupeMenuCategories(restaurantId);

    const existing = await this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
    });
    const byName = new Map<string, (typeof existing)[0]>();
    for (const cat of existing) {
      if (!byName.has(cat.name)) byName.set(cat.name, cat);
    }

    for (const preset of activePresets) {
      const found = byName.get(preset.name);
      if (found) {
        await this.prisma.menuCategory.update({
          where: { id: found.id },
          data: { sortOrder: preset.sortOrder, isActive: true },
        });
      } else {
        await this.prisma.menuCategory.create({
          data: {
            restaurantId,
            name: preset.name,
            sortOrder: preset.sortOrder,
            isActive: true,
          },
        });
      }
    }

    for (const cat of existing) {
      if (!allowedNames.has(cat.name) && cat.isActive) {
        await this.prisma.menuCategory.update({
          where: { id: cat.id },
          data: { isActive: false },
        });
      }
    }
  }

  private async presetCategoryNames(restaurantId: string): Promise<Set<string>> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { categories: true },
    });
    return presetCategoryNamesForCuisines(restaurant?.categories);
  }

  async getMyRestaurant(userId: string) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const itemCount = await this.prisma.menuItem.count({
      where: { restaurantId: restaurant.id },
    });
    return { ...restaurant, itemCount };
  }

  async updateRestaurantProfile(userId: string, dto: UpdateRestaurantProfileDto) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() }),
        ...(dto.email !== undefined && { email: dto.email?.trim() }),
        ...(dto.address !== undefined && { address: dto.address.trim() }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.isOpen !== undefined && { isOpen: dto.isOpen }),
        ...(dto.isBusy !== undefined && { isBusy: dto.isBusy }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.minOrderAmount !== undefined && { minOrderAmount: fromNleAmount(dto.minOrderAmount) }),
        ...(dto.deliveryTimeMin !== undefined && { deliveryTimeMin: dto.deliveryTimeMin }),
        ...(dto.deliveryTimeMax !== undefined && { deliveryTimeMax: dto.deliveryTimeMax }),
        ...(dto.openingHours !== undefined && {
          openingHours: dto.openingHours as Prisma.InputJsonValue,
        }),
        ...(dto.categories !== undefined && { categories: dto.categories }),
      },
      include: { city: { select: { name: true, slug: true } } },
    });
    if (dto.categories !== undefined) {
      await this.ensureMenuCategories(restaurant.id);
    }
    return updated;
  }

  listPromotions(userId: string) {
    return this.getOwnedRestaurant(userId).then((r) =>
      this.promotionsService.listWithUsageStatsForRestaurant(r.id),
    );
  }

  createPromotion(userId: string, dto: CreatePromotionDto) {
    return this.getOwnedRestaurant(userId).then((r) =>
      this.promotionsService.create(dto, r.id),
    );
  }

  updatePromotion(userId: string, promoId: string, dto: UpdatePromotionDto) {
    return this.getOwnedRestaurant(userId).then((r) =>
      this.promotionsService.update(promoId, dto, r.id),
    );
  }

  deletePromotion(userId: string, promoId: string) {
    return this.getOwnedRestaurant(userId).then((r) =>
      this.promotionsService.remove(promoId, r.id),
    );
  }

  private readonly activeOrderStatuses: OrderStatus[] = [
    OrderStatus.PLACED,
    OrderStatus.RESTAURANT_ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.RIDER_ASSIGNED,
    OrderStatus.ON_THE_WAY,
  ];

  async getDashboard(userId: string) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deliveredRevenueWhere = {
      restaurantId: restaurant.id,
      status: OrderStatus.DELIVERED,
      deliveredAt: { not: null },
    } as const;

    const [itemCount, activeOrders, pendingOrders, todayStats, totalStats, orders] =
      await Promise.all([
      this.prisma.menuItem.count({ where: { restaurantId: restaurant.id } }),
      this.prisma.order.count({
        where: { restaurantId: restaurant.id, status: { in: this.activeOrderStatuses } },
      }),
      this.prisma.order.count({
        where: { restaurantId: restaurant.id, status: OrderStatus.PLACED },
      }),
      this.prisma.order.aggregate({
        where: {
          ...deliveredRevenueWhere,
          deliveredAt: { gte: startOfDay },
        },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: deliveredRevenueWhere,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.findMany({
        where: { restaurantId: restaurant.id, updatedAt: { gte: weekAgo } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          deliveredAt: true,
          customer: { select: { firstName: true, lastName: true } },
          payment: { select: { status: true } },
          review: { select: { id: true, rating: true, comment: true, createdAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
    ]);

    const completedToday = todayStats._count._all;
    const revenueToday = todayStats._sum.totalAmount ?? 0;
    const totalRevenue = totalStats._sum.totalAmount ?? 0;
    const totalDeliveredOrders = totalStats._count._all;

    const notifications: {
      id: string;
      type: 'NEW_ORDER' | 'PAYMENT' | 'DELIVERED' | 'RATING';
      orderId: string;
      orderNumber: string;
      message: string;
      createdAt: string;
      rating?: number;
      comment?: string | null;
    }[] = [];

    for (const order of orders) {
      const customerName =
        [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Customer';

      if (order.status === OrderStatus.PLACED) {
        notifications.push({
          id: `${order.id}-new`,
          type: 'NEW_ORDER',
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: `New order from ${customerName}`,
          createdAt: order.createdAt.toISOString(),
        });
      }

      if (order.status === OrderStatus.DELIVERED && order.deliveredAt) {
        notifications.push({
          id: `${order.id}-delivered`,
          type: 'DELIVERED',
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: `${customerName} confirmed delivery`,
          createdAt: order.deliveredAt.toISOString(),
        });
        if (order.payment?.status === 'COMPLETED') {
          notifications.push({
            id: `${order.id}-payment`,
            type: 'PAYMENT',
            orderId: order.id,
            orderNumber: order.orderNumber,
            message: `Payment received for ${order.orderNumber}`,
            createdAt: order.deliveredAt.toISOString(),
          });
        }
      }

      if (order.review) {
        const stars = '★'.repeat(order.review.rating);
        notifications.push({
          id: `${order.id}-rating`,
          type: 'RATING',
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: `${customerName} rated ${stars} on ${order.orderNumber}`,
          createdAt: order.review.createdAt.toISOString(),
          rating: order.review.rating,
          comment: order.review.comment,
        });
      }
    }

    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        status: restaurant.status,
        isOpen: restaurant.isOpen,
        isBusy: restaurant.isBusy,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        address: restaurant.address,
        phone: restaurant.phone,
        itemCount,
        city: restaurant.city,
      },
      stats: {
        activeOrders,
        pendingOrders,
        completedToday,
        revenueToday,
        totalRevenue,
        totalDeliveredOrders,
      },
      notifications: notifications.slice(0, 30),
    };
  }

  async getRevenueReport(userId: string, query: RevenueQueryDto) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const { period, year, month } = query;

    if (month != null && year == null) {
      throw new BadRequestException('Select a year when filtering by month');
    }

    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;

    if (period === RevenuePeriod.DAY) {
      if (year != null && month != null) {
        rangeStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
        rangeEnd = new Date(year, month, 0, 23, 59, 59, 999);
      } else if (year != null) {
        rangeStart = new Date(year, 0, 1, 0, 0, 0, 0);
        rangeEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      } else {
        rangeEnd = new Date(now);
        rangeEnd.setHours(23, 59, 59, 999);
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 29);
        rangeStart.setHours(0, 0, 0, 0);
      }
    } else if (period === RevenuePeriod.MONTH) {
      if (year != null) {
        rangeStart = new Date(year, 0, 1, 0, 0, 0, 0);
        rangeEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      } else {
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      }
    } else {
      rangeStart = new Date(2020, 0, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now);
      rangeEnd.setHours(23, 59, 59, 999);
      if (year != null) {
        rangeStart = new Date(year, 0, 1, 0, 0, 0, 0);
        rangeEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    }

    if (rangeEnd > now) {
      rangeEnd = new Date(now);
      rangeEnd.setHours(23, 59, 59, 999);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        deliveredAt: true,
      },
      orderBy: { deliveredAt: 'asc' },
    });

    const bucketMap = new Map<
      string,
      { key: string; label: string; orderCount: number; revenue: number }
    >();

    for (const order of orders) {
      if (!order.deliveredAt) continue;
      const { key, label } = this.revenueBucketKey(order.deliveredAt, period);
      const existing = bucketMap.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.revenue += order.totalAmount;
      } else {
        bucketMap.set(key, { key, label, orderCount: 1, revenue: order.totalAmount });
      }
    }

    const rows = [...bucketMap.values()].sort((a, b) => b.key.localeCompare(a.key));
    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const totalOrders = rows.reduce((sum, r) => sum + r.orderCount, 0);

    return {
      period,
      year: year ?? null,
      month: month ?? null,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalRevenue,
      totalOrders,
      rows,
    };
  }

  private revenueBucketKey(
    date: Date,
    period: RevenuePeriod,
  ): { key: string; label: string } {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();

    if (period === RevenuePeriod.DAY) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const label = date.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      return { key, label };
    }

    if (period === RevenuePeriod.MONTH) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      return { key, label };
    }

    const key = String(y);
    return { key, label: key };
  }

  private dedupeCategoriesByName<T extends { name: string }>(cats: T[]): T[] {
    const seen = new Set<string>();
    return cats.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }

  async getMenuCategoryOptions(userId: string) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const activeCategoryCount = await this.prisma.menuCategory.count({
      where: { restaurantId: restaurant.id, isActive: true },
    });
    if (activeCategoryCount === 0) {
      await this.ensureMenuCategories(restaurant.id);
    }
    const presetNames = await this.presetCategoryNames(restaurant.id);
    const categories = await this.prisma.menuCategory.findMany({
      where: {
        restaurantId: restaurant.id,
        OR: [
          { isActive: true, name: { in: [...presetNames] } },
          { items: { some: {} } },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, sortOrder: true },
    });
    return {
      categories: this.dedupeCategoriesByName(categories),
      restaurantCuisines: restaurant.categories ?? [],
      presets: presetsForRestaurantCuisines(restaurant.categories),
    };
  }

  async getMenu(userId: string) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const activeCategoryCount = await this.prisma.menuCategory.count({
      where: { restaurantId: restaurant.id, isActive: true },
    });
    if (activeCategoryCount === 0) {
      await this.ensureMenuCategories(restaurant.id);
    }

    const allItems = await this.prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true, sortOrder: true } } },
    });

    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        sortOrder: number;
        items: typeof allItems;
      }
    >();

    for (const item of allItems) {
      if (!item.categoryId || !item.category) {
        continue;
      }
      const key = item.category.id;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: item.category.id,
          name: item.category.name,
          sortOrder: item.category.sortOrder,
          items: [],
        });
      }
      categoryMap.get(key)!.items.push(item);
    }

    const categories = [...categoryMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    const uncategorized = allItems.filter((i) => !i.categoryId);

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        status: restaurant.status,
        categories: restaurant.categories,
      },
      categories: this.dedupeCategoriesByName(categories),
      uncategorized,
      itemCount: allItems.length,
    };
  }

  async createCategory(userId: string, dto: CreateMenuCategoryDto) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const allowed = await this.presetCategoryNames(restaurant.id);
    if (!allowed.has(dto.name.trim())) {
      throw new BadRequestException('Use a standard category from the menu list');
    }
    return this.prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  private async resolveCategoryId(restaurantId: string, categoryId: string) {
    const cat = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId, isActive: true },
    });
    if (!cat) throw new BadRequestException('Select a valid category');
    const allowed = await this.presetCategoryNames(restaurantId);
    if (!allowed.has(cat.name)) {
      throw new BadRequestException('Select a standard menu category');
    }
    return cat.id;
  }

  async createMenuItem(userId: string, dto: CreateMenuItemDto) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const activeCategoryCount = await this.prisma.menuCategory.count({
      where: { restaurantId: restaurant.id, isActive: true },
    });
    if (activeCategoryCount === 0) {
      await this.ensureMenuCategories(restaurant.id);
    }
    const categoryId = await this.resolveCategoryId(restaurant.id, dto.categoryId);

    return this.prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        imageUrl: dto.imageUrl,
        galleryUrls: dto.galleryUrls ?? [],
        prepTimeMin: dto.prepTimeMin ?? 15,
        isAvailable: dto.isAvailable ?? true,
        isPopular: dto.isPopular ?? false,
        isFeatured: dto.isFeatured ?? false,
        tags: dto.tags ?? [],
      },
      include: { category: true },
    });
  }

  async updateMenuItem(userId: string, itemId: string, dto: UpdateMenuItemDto) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    let categoryId: string | null | undefined = dto.categoryId;
    if (dto.categoryId) {
      categoryId = await this.resolveCategoryId(restaurant.id, dto.categoryId);
    }

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.compareAtPrice !== undefined && { compareAtPrice: dto.compareAtPrice }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.galleryUrls !== undefined && { galleryUrls: dto.galleryUrls }),
        ...(dto.prepTimeMin !== undefined && { prepTimeMin: dto.prepTimeMin }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.isPopular !== undefined && { isPopular: dto.isPopular }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
      },
      include: { category: true },
    });
  }

  async deleteMenuItem(userId: string, itemId: string) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId: restaurant.id },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async getOrders(userId: string, status?: OrderStatus) {
    const restaurant = await this.getOwnedRestaurant(userId);
    return this.prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        ...(status ? { status } : {}),
      },
      include: {
        items: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        payment: { select: { method: true, status: true } },
        review: { select: { id: true, rating: true, foodRating: true, comment: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getOrder(userId: string, orderId: string) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      include: {
        items: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        payment: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        review: {
          select: {
            id: true,
            rating: true,
            foodRating: true,
            comment: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(userId: string, orderId: string, dto: UpdateOwnerOrderStatusDto) {
    const restaurant = await this.getOwnedRestaurant(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = OWNER_STATUS_TRANSITIONS[order.status];
    if (!allowed?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change order from ${order.status.replace(/_/g, ' ')} to ${dto.status.replace(/_/g, ' ')}`,
      );
    }

    return this.ordersService.updateStatus(orderId, dto.status, userId, dto.note);
  }
}
