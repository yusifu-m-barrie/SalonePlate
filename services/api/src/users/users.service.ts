import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveMediaUrl } from '../common/media-url';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        wallet: true,
        favorites: { include: { restaurant: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...safe } = user;
    return {
      ...safe,
      favorites: safe.favorites.map((f) => ({
        ...f,
        restaurant: f.restaurant
          ? {
              ...f.restaurant,
              coverImage: resolveMediaUrl(f.restaurant.coverImage) ?? f.restaurant.coverImage,
              logoUrl: resolveMediaUrl(f.restaurant.logoUrl) ?? f.restaurant.logoUrl,
            }
          : f.restaurant,
      })),
    };
  }

  private parseSettings(raw: Prisma.JsonValue | null): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as Record<string, unknown>;
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      avatarUrl: string;
      language: string;
      settings: UpdateUserSettingsDto;
    }>,
  ) {
    const update: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl;
    if (data.language !== undefined) update.language = data.language;

    if (data.settings) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
      const current = this.parseSettings(user?.settings ?? null);
      update.settings = {
        ...current,
        ...(data.settings.orderUpdates !== undefined && { orderUpdates: data.settings.orderUpdates }),
        ...(data.settings.promos !== undefined && { promos: data.settings.promos }),
        ...(data.settings.defaultPaymentMethod !== undefined && {
          defaultPaymentMethod: data.settings.defaultPaymentMethod,
        }),
        ...(data.settings.orangeMoneyPhone !== undefined && {
          orangeMoneyPhone: data.settings.orangeMoneyPhone,
        }),
      };
    }

    return this.prisma.user.update({ where: { id: userId }, data: update });
  }

  async addAddress(userId: string, data: {
    label: string; street: string; city: string; district?: string;
    lat: number; lng: number; isDefault?: boolean; instructions?: string;
  }) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...data, userId } });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    data: Partial<{
      label: string;
      street: string;
      city: string;
      isDefault?: boolean;
      instructions?: string;
    }>,
  ) {
    const addr = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({
      where: { id: addressId },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.street !== undefined && { street: data.street }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const addr = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { ok: true };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const addr = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id: addressId }, data: { isDefault: true } });
  }

  async getReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, loyaltyPoints: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const referredCount = await this.prisma.user.count({ where: { referredById: userId } });
    return {
      referralCode: user.referralCode,
      loyaltyPoints: user.loyaltyPoints,
      referredCount,
      rewardPerReferral: 50,
      message: 'Share your code — friends get a warm welcome and you earn loyalty points when they order.',
    };
  }

  async listNotifications(userId: string, limit = 40) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const n = await this.prisma.notification.findFirst({ where: { id: notificationId, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async createSupportTicket(userId: string, subject: string, message: string) {
    return this.prisma.supportTicket.create({
      data: { userId, subject: subject.trim(), message: message.trim() },
    });
  }

  async listSupportTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getPaymentPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true, phone: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const settings = this.parseSettings(user.settings);
    return {
      defaultPaymentMethod: (settings.defaultPaymentMethod as string) || 'CASH_ON_DELIVERY',
      orangeMoneyPhone: (settings.orangeMoneyPhone as string) || user.phone || '',
      methods: [
        { id: 'ORANGE_MONEY', label: 'Orange Money', available: true },
        { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery', available: true },
        { id: 'AIRTEL_MONEY', label: 'Airtel Money', available: true },
        { id: 'CARD', label: 'Card', available: false, note: 'Coming soon' },
      ],
    };
  }

  async getOrderHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: userId },
        include: {
          restaurant: { select: { id: true, name: true, slug: true, logoUrl: true } },
          items: true,
          review: { select: { rating: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { customerId: userId } }),
    ]);
    return { orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  private readonly activeOrderStatuses: OrderStatus[] = [
    OrderStatus.PLACED,
    OrderStatus.RESTAURANT_ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.RIDER_ASSIGNED,
    OrderStatus.ON_THE_WAY,
  ];

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        loyaltyPoints: true,
        referralCode: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            coverImage: true,
            rating: true,
            reviewCount: true,
          },
        },
        review: { select: { id: true, rating: true, createdAt: true } },
        payment: { select: { method: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 150,
    });

    const activeOrders = orders.filter((o) => this.activeOrderStatuses.includes(o.status));
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const spentToday = deliveredOrders
      .filter((o) => o.deliveredAt && new Date(o.deliveredAt) >= startOfDay)
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const ordersToday = orders.filter((o) => new Date(o.createdAt) >= startOfDay).length;

    type RestaurantSummary = {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
      coverImage?: string | null;
      rating: number;
      reviewCount: number;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string;
    };

    const restaurantMap = new Map<string, RestaurantSummary>();
    for (const order of orders) {
      if (!order.restaurant) continue;
      const r = order.restaurant;
      const existing = restaurantMap.get(r.id);
      const entry: RestaurantSummary = existing || {
        id: r.id,
        name: r.name,
        slug: r.slug,
        logoUrl: r.logoUrl,
        coverImage: r.coverImage,
        rating: r.rating,
        reviewCount: r.reviewCount,
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: order.createdAt.toISOString(),
      };
      entry.orderCount += 1;
      if (order.status === OrderStatus.DELIVERED) {
        entry.totalSpent += order.totalAmount;
      }
      if (new Date(order.createdAt) > new Date(entry.lastOrderAt)) {
        entry.lastOrderAt = order.createdAt.toISOString();
      }
      restaurantMap.set(r.id, entry);
    }

    const restaurants = [...restaurantMap.values()].sort(
      (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
    );

    const statusMessages: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.PLACED]: 'Waiting for restaurant to accept',
      [OrderStatus.RESTAURANT_ACCEPTED]: 'Restaurant confirmed your order',
      [OrderStatus.PREPARING]: 'Your food is being prepared',
      [OrderStatus.RIDER_ASSIGNED]: 'Order is ready',
      [OrderStatus.ON_THE_WAY]: 'On the way to you',
      [OrderStatus.DELIVERED]: 'Delivered — enjoy your meal!',
      [OrderStatus.CANCELLED]: 'Order was cancelled',
    };

    const notifications: {
      id: string;
      type: string;
      orderId: string;
      orderNumber: string;
      restaurantName: string;
      message: string;
      createdAt: string;
      status?: string;
    }[] = [];

    for (const order of orders) {
      const restaurantName = order.restaurant?.name || 'Restaurant';
      if (this.activeOrderStatuses.includes(order.status)) {
        notifications.push({
          id: `${order.id}-active`,
          type: 'ORDER_UPDATE',
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantName,
          status: order.status,
          message: statusMessages[order.status] || `Update on ${order.orderNumber}`,
          createdAt: order.updatedAt.toISOString(),
        });
      }
      if (
        order.status === OrderStatus.DELIVERED &&
        order.deliveredAt &&
        new Date(order.deliveredAt) >= weekAgo
      ) {
        notifications.push({
          id: `${order.id}-delivered`,
          type: 'DELIVERED',
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantName,
          message: `Delivered from ${restaurantName}`,
          createdAt: order.deliveredAt.toISOString(),
        });
      }
      if (order.review && new Date(order.review.createdAt) >= weekAgo) {
        notifications.push({
          id: `${order.id}-rated`,
          type: 'RATED',
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantName,
          message: `You rated ${restaurantName} ${order.review.rating}★`,
          createdAt: order.review.createdAt.toISOString(),
        });
      }
      if (
        order.status === OrderStatus.CANCELLED &&
        new Date(order.updatedAt) >= weekAgo
      ) {
        notifications.push({
          id: `${order.id}-cancelled`,
          type: 'CANCELLED',
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantName,
          message: `Order cancelled at ${restaurantName}`,
          createdAt: order.updatedAt.toISOString(),
        });
      }
    }

    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const recentOrders = orders.slice(0, 6).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      restaurant: o.restaurant,
      review: o.review,
    }));

    return {
      user,
      stats: {
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        completedOrders: deliveredOrders.length,
        totalSpent,
        spentToday,
        ordersToday,
        restaurantsCount: restaurants.length,
      },
      restaurants,
      notifications: notifications.slice(0, 25),
      recentOrders,
    };
  }
}
