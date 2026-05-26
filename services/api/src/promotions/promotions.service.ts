import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PromoType, UserRole } from '@prisma/client';
import { formatCurrency, fromNleAmount } from '../common/utils/currency';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  private computeDiscount(promo: { type: PromoType; value: number; maxDiscount: number | null }, subtotal: number) {
    let discount = 0;
    if (promo.type === PromoType.PERCENTAGE) {
      discount = subtotal * (promo.value / 100);
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else if (promo.type === PromoType.FIXED_AMOUNT) {
      discount = promo.value;
    }
    return Math.min(discount, subtotal);
  }

  private async assertPromoValid(
    promo: {
      id: string;
      isActive: boolean;
      expiresAt: Date | null;
      startsAt: Date;
      usageLimit: number | null;
      usedCount: number;
      minOrder: number | null;
      restaurantId: string | null;
      type: PromoType;
      value: number;
      maxDiscount: number | null;
    },
    subtotal: number,
    restaurantId?: string,
  ) {
    if (!promo.isActive) throw new BadRequestException('Invalid promo code');
    if (promo.startsAt > new Date()) throw new BadRequestException('Promo code is not active yet');
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Promo code expired');
    }
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Promo code usage limit reached');
    }
    if (promo.minOrder && subtotal < promo.minOrder) {
      throw new BadRequestException(`Minimum order ${formatCurrency(promo.minOrder)} required`);
    }
    if (promo.restaurantId && promo.restaurantId !== restaurantId) {
      throw new BadRequestException('Promo not valid for this restaurant');
    }
  }

  /** Preview discount without incrementing usage (checkout). */
  async preview(code: string, subtotal: number, restaurantId?: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { code: this.normalizeCode(code) },
      include: { restaurant: { select: { name: true } } },
    });
    if (!promo) throw new BadRequestException('Invalid promo code');
    await this.assertPromoValid(promo, subtotal, restaurantId);

    const discount =
      promo.type === PromoType.FREE_DELIVERY ? 0 : this.computeDiscount(promo, subtotal);

    return {
      promo: {
        id: promo.id,
        code: promo.code,
        title: promo.title,
        type: promo.type,
        value: promo.value,
        restaurantName: promo.restaurant?.name,
      },
      discount,
      freeDelivery: promo.type === PromoType.FREE_DELIVERY,
    };
  }

  /** Used when order is created — increments usage. */
  async validateAndApply(code: string, subtotal: number, restaurantId?: string) {
    const preview = await this.preview(code, subtotal, restaurantId);
    const promo = await this.prisma.promotion.findUnique({ where: { id: preview.promo.id } });
    if (!promo) throw new BadRequestException('Invalid promo code');
    await this.prisma.promotion.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    });
    return {
      promo,
      discount: preview.discount,
    };
  }

  async recordUsage(promoId: string) {
    await this.prisma.promotion.update({
      where: { id: promoId },
      data: { usedCount: { increment: 1 } },
    });
  }

  findActive(cityId?: string, restaurantId?: string) {
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        ...(restaurantId
          ? { restaurantId }
          : cityId
            ? { OR: [{ cityId }, { cityId: null, restaurantId: null }] }
            : {}),
      },
      include: { restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll(restaurantId?: string) {
    return this.prisma.promotion.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      include: {
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Restaurant owner: coupons with usage and dishes ordered with each code. */
  async listWithUsageStatsForRestaurant(restaurantId: string) {
    const promos = await this.prisma.promotion.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const ordersWithPromo = await this.prisma.order.findMany({
      where: { restaurantId, promoCode: { not: null }, createdAt: { gte: since } },
      take: 150,
      select: {
        promoCode: true,
        customerId: true,
        discountAmount: true,
        totalAmount: true,
        createdAt: true,
        items: { select: { name: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    type MenuItemAgg = { name: string; totalQuantity: number };
    type UsageAgg = {
      orderCount: number;
      customerIds: Set<string>;
      totalDiscount: number;
      totalOrderValue: number;
      lastUsedAt: Date | null;
      menuItems: Map<string, MenuItemAgg>;
    };

    const usageByCode = new Map<string, UsageAgg>();

    for (const order of ordersWithPromo) {
      if (!order.promoCode) continue;
      const code = this.normalizeCode(order.promoCode);
      if (!usageByCode.has(code)) {
        usageByCode.set(code, {
          orderCount: 0,
          customerIds: new Set(),
          totalDiscount: 0,
          totalOrderValue: 0,
          lastUsedAt: null,
          menuItems: new Map(),
        });
      }
      const agg = usageByCode.get(code)!;
      agg.orderCount += 1;
      agg.customerIds.add(order.customerId);
      agg.totalDiscount += order.discountAmount;
      agg.totalOrderValue += order.totalAmount;
      if (!agg.lastUsedAt || order.createdAt > agg.lastUsedAt) {
        agg.lastUsedAt = order.createdAt;
      }
      for (const line of order.items) {
        const cur = agg.menuItems.get(line.name) ?? { name: line.name, totalQuantity: 0 };
        cur.totalQuantity += line.quantity;
        agg.menuItems.set(line.name, cur);
      }
    }

    const now = new Date();

    return promos.map((p) => {
      const usage = usageByCode.get(this.normalizeCode(p.code));
      const orderCount = usage?.orderCount ?? 0;
      const isExpired = !!(p.expiresAt && p.expiresAt < now);
      const isUsed = orderCount > 0 || p.usedCount > 0;
      const menuItems = [...(usage?.menuItems.values() ?? [])].sort(
        (a, b) => b.totalQuantity - a.totalQuantity,
      );

      return {
        ...p,
        isUsed,
        isExpired,
        stats: {
          orderCount,
          uniqueCustomers: usage?.customerIds.size ?? 0,
          totalDiscount: usage?.totalDiscount ?? 0,
          totalOrderValue: usage?.totalOrderValue ?? 0,
          lastUsedAt: usage?.lastUsedAt?.toISOString() ?? null,
          menuItems,
        },
      };
    });
  }

  /** Admin: promotions with real usage from orders (customers, restaurants, money). */
  async listAllWithUsageStats() {
    const promos = await this.prisma.promotion.findMany({
      include: { restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const ordersWithPromo = await this.prisma.order.findMany({
      where: { promoCode: { not: null } },
      select: {
        promoCode: true,
        customerId: true,
        discountAmount: true,
        totalAmount: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    type RestaurantUsage = {
      id: string;
      name: string;
      orderCount: number;
      totalDiscount: number;
      totalOrderValue: number;
    };

    type UsageAgg = {
      orderCount: number;
      customerIds: Set<string>;
      totalDiscount: number;
      totalOrderValue: number;
      lastUsedAt: Date | null;
      restaurants: Map<string, RestaurantUsage>;
    };

    const usageByCode = new Map<string, UsageAgg>();

    for (const order of ordersWithPromo) {
      if (!order.promoCode) continue;
      const code = this.normalizeCode(order.promoCode);
      if (!usageByCode.has(code)) {
        usageByCode.set(code, {
          orderCount: 0,
          customerIds: new Set(),
          totalDiscount: 0,
          totalOrderValue: 0,
          lastUsedAt: null,
          restaurants: new Map(),
        });
      }
      const agg = usageByCode.get(code)!;
      agg.orderCount += 1;
      agg.customerIds.add(order.customerId);
      agg.totalDiscount += order.discountAmount;
      agg.totalOrderValue += order.totalAmount;
      if (!agg.lastUsedAt || order.createdAt > agg.lastUsedAt) {
        agg.lastUsedAt = order.createdAt;
      }

      const rId = order.restaurant.id;
      if (!agg.restaurants.has(rId)) {
        agg.restaurants.set(rId, {
          id: rId,
          name: order.restaurant.name,
          orderCount: 0,
          totalDiscount: 0,
          totalOrderValue: 0,
        });
      }
      const rUsage = agg.restaurants.get(rId)!;
      rUsage.orderCount += 1;
      rUsage.totalDiscount += order.discountAmount;
      rUsage.totalOrderValue += order.totalAmount;
    }

    const now = new Date();

    return promos.map((p) => {
      const usage = usageByCode.get(this.normalizeCode(p.code));
      const orderCount = usage?.orderCount ?? 0;
      const uniqueCustomers = usage?.customerIds.size ?? 0;
      const isExpired = !!(p.expiresAt && p.expiresAt < now);
      const isUsed = orderCount > 0 || p.usedCount > 0;

      return {
        ...p,
        isUsed,
        isExpired,
        stats: {
          orderCount,
          uniqueCustomers,
          totalDiscount: usage?.totalDiscount ?? 0,
          totalOrderValue: usage?.totalOrderValue ?? 0,
          lastUsedAt: usage?.lastUsedAt?.toISOString() ?? null,
          restaurants: [...(usage?.restaurants.values() ?? [])].sort(
            (a, b) => b.orderCount - a.orderCount,
          ),
        },
      };
    });
  }

  async create(dto: CreatePromotionDto, ownerRestaurantId?: string) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.prisma.promotion.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('Promo code already exists');

    const restaurantId = ownerRestaurantId || dto.restaurantId || null;
    if (ownerRestaurantId && dto.restaurantId && dto.restaurantId !== ownerRestaurantId) {
      throw new ForbiddenException('Cannot create promo for another restaurant');
    }

    const minOrder = dto.minOrder != null ? fromNleAmount(dto.minOrder) : undefined;
    const maxDiscount = dto.maxDiscount != null ? fromNleAmount(dto.maxDiscount) : undefined;
    const value =
      dto.type === PromoType.PERCENTAGE
        ? dto.value
        : dto.type === PromoType.FREE_DELIVERY
          ? 0
          : fromNleAmount(dto.value);

    return this.prisma.promotion.create({
      data: {
        code,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        type: dto.type,
        value,
        minOrder,
        maxDiscount,
        restaurantId,
        cityId: dto.cityId,
        usageLimit: dto.usageLimit,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { restaurant: { select: { name: true } } },
    });
  }

  async update(id: string, dto: UpdatePromotionDto, ownerRestaurantId?: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    if (ownerRestaurantId && promo.restaurantId !== ownerRestaurantId) {
      throw new ForbiddenException('Not your promotion');
    }

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.value !== undefined && {
          value:
            dto.type === PromoType.PERCENTAGE || promo.type === PromoType.PERCENTAGE
              ? dto.value
              : fromNleAmount(dto.value),
        }),
        ...(dto.minOrder !== undefined && { minOrder: fromNleAmount(dto.minOrder) }),
        ...(dto.maxDiscount !== undefined && { maxDiscount: fromNleAmount(dto.maxDiscount) }),
        ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { restaurant: { select: { name: true } } },
    });
  }

  async remove(id: string, ownerRestaurantId?: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    if (ownerRestaurantId && promo.restaurantId !== ownerRestaurantId) {
      throw new ForbiddenException('Not your promotion');
    }
    await this.prisma.promotion.delete({ where: { id } });
    return { deleted: true };
  }
}
