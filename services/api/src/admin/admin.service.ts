import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, RestaurantStatus, RiderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { fromNleAmount } from '../common/utils/currency';
import { endOfDay, isDateOnlyQuery, parseDateParam } from '../common/utils/date-range';
import { SearchOrdersDto } from './dto/search-orders.dto';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.RESTAURANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.ON_THE_WAY,
];

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private buildActivityFeed(
    orders: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      updatedAt: Date;
      createdAt: Date;
      deliveredAt: Date | null;
      restaurant: { id: string; name: string; isOpen: boolean } | null;
      customer: { firstName: string | null; lastName: string | null } | null;
      review: { rating: number; comment: string | null; createdAt: Date } | null;
      timeline: { status: OrderStatus; note: string | null; createdAt: Date }[];
    }[],
  ) {
    const notifications: {
      id: string;
      type: string;
      orderId: string;
      orderNumber: string;
      restaurantId?: string;
      restaurantName: string;
      customerName: string;
      message: string;
      createdAt: string;
      status?: string;
    }[] = [];

    const customerName = (c: { firstName: string | null; lastName: string | null } | null) =>
      [c?.firstName, c?.lastName].filter(Boolean).join(' ') || 'Customer';

    for (const order of orders) {
      const rName = order.restaurant?.name || 'Restaurant';
      const cName = customerName(order.customer);

      notifications.push({
        id: `${order.id}-placed`,
        type: 'ORDER_PLACED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId: order.restaurant?.id,
        restaurantName: rName,
        customerName: cName,
        message: `${cName} placed order ${order.orderNumber} at ${rName}`,
        createdAt: order.createdAt.toISOString(),
        status: order.status,
      });

      for (const t of order.timeline.slice(0, 8)) {
        if (t.status === OrderStatus.PLACED) continue;
        notifications.push({
          id: `${order.id}-tl-${t.createdAt.getTime()}`,
          type: 'ORDER_UPDATE',
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurant?.id,
          restaurantName: rName,
          customerName: cName,
          message: t.note || `${order.orderNumber}: ${t.status.replace(/_/g, ' ')}`,
          createdAt: t.createdAt.toISOString(),
          status: t.status,
        });
      }

      if (order.review) {
        notifications.push({
          id: `${order.id}-review`,
          type: 'RATING',
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurant?.id,
          restaurantName: rName,
          customerName: cName,
          message: `${cName} rated ${rName} ${order.review.rating}★ on ${order.orderNumber}`,
          createdAt: order.review.createdAt.toISOString(),
        });
      }
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifications.slice(0, 40);
  }

  async getDashboardStats(cityId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const restaurantFilter = cityId ? { cityId } : {};

    const [
      totalRevenue,
      ordersToday,
      activeUsers,
      topRestaurants,
      liveOrders,
      totalRestaurants,
      totalRiders,
      totalCustomers,
      recentActivityOrders,
      restaurantsWithActivity,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: OrderStatus.DELIVERED, ...(cityId ? { restaurant: { cityId } } : {}) },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: today }, ...(cityId ? { restaurant: { cityId } } : {}) },
      }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', isBanned: false } }),
      this.prisma.restaurant.findMany({
        where: { status: RestaurantStatus.APPROVED, ...restaurantFilter },
        orderBy: { rating: 'desc' },
        take: 5,
        select: { id: true, name: true, rating: true, reviewCount: true, isOpen: true },
      }),
      this.prisma.order.findMany({
        where: {
          status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
          ...(cityId ? { restaurant: { cityId } } : {}),
        },
        include: {
          restaurant: { select: { id: true, name: true, isOpen: true, phone: true } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.restaurant.count({ where: restaurantFilter }),
      this.prisma.rider.count({ where: { status: RiderStatus.APPROVED } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.order.findMany({
        where: { updatedAt: { gte: weekAgo }, ...(cityId ? { restaurant: { cityId } } : {}) },
        include: {
          restaurant: { select: { id: true, name: true, isOpen: true } },
          customer: { select: { firstName: true, lastName: true } },
          review: { select: { rating: true, comment: true, createdAt: true } },
          timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.restaurant.findMany({
        where: { status: RestaurantStatus.APPROVED, ...restaurantFilter },
        select: {
          id: true,
          name: true,
          status: true,
          isOpen: true,
          isBusy: true,
          phone: true,
          owner: { select: { firstName: true, lastName: true, phone: true, email: true } },
          orders: {
            where: { status: { in: ACTIVE_ORDER_STATUSES } },
            select: { id: true, status: true, createdAt: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              orders: {
                where: { status: OrderStatus.PLACED },
              },
            },
          },
        },
        take: 50,
      }),
    ]);

    const last7Days = await this.getRevenueChart(7, cityId);
    const notifications = this.buildActivityFeed(recentActivityOrders);

    const restaurantActivity = restaurantsWithActivity.map((r) => ({
      id: r.id,
      name: r.name,
      isOpen: r.isOpen,
      isBusy: r.isBusy,
      phone: r.phone,
      owner: r.owner,
      pendingOrders: r._count.orders,
      activeOrders: r.orders.length,
      needsAttention: r._count.orders > 0 && r.isOpen,
      isActive: r.isOpen && r.status === RestaurantStatus.APPROVED,
      activeOrderPreviews: r.orders,
    }));

    return {
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      ordersToday,
      activeUsers,
      topRestaurants,
      liveOrders,
      totalRestaurants,
      totalRiders,
      totalCustomers,
      revenueChart: last7Days,
      notifications,
      restaurantActivity,
      stats: {
        liveOrdersCount: liveOrders.length,
        pendingRestaurantAlerts: restaurantActivity.filter((r) => r.needsAttention).length,
      },
    };
  }

  private async getRevenueChart(days: number, cityId?: string) {
    const chart = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const revenue = await this.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          createdAt: { gte: date, lt: next },
          ...(cityId ? { restaurant: { cityId } } : {}),
        },
        _sum: { totalAmount: true },
      });

      chart.push({
        date: date.toISOString().split('T')[0],
        revenue: revenue._sum.totalAmount || 0,
      });
    }
    return chart;
  }

  async searchOrders(dto: SearchOrdersDto) {
    const page = Number(dto.page) || 1;
    const limit = Math.min(Number(dto.limit) || 25, 100);
    const skip = (page - 1) * limit;

    const and: Prisma.OrderWhereInput[] = [];

    if (dto.q?.trim()) {
      const q = dto.q.trim();
      if (isDateOnlyQuery(q)) {
        const day = parseDateParam(q);
        if (!day) throw new BadRequestException(`Invalid date: ${q}`);
        and.push({
          createdAt: { gte: day, lte: endOfDay(day) },
        });
      } else {
        and.push({
          OR: [
            { id: { contains: q, mode: 'insensitive' } },
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customer: { phone: { contains: q } } },
            { customer: { email: { contains: q, mode: 'insensitive' } } },
            { customer: { firstName: { contains: q, mode: 'insensitive' } } },
            { customer: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        });
      }
    }

    if (dto.location?.trim()) {
      const loc = dto.location.trim();
      and.push({
        OR: [
          { deliveryAddress: { path: ['street'], string_contains: loc } },
          { deliveryAddress: { path: ['city'], string_contains: loc } },
        ],
      });
    }

    if (dto.food?.trim()) {
      and.push({
        items: { some: { name: { contains: dto.food.trim(), mode: 'insensitive' } } },
      });
    }

    if (dto.minAmount) {
      and.push({ totalAmount: { gte: fromNleAmount(Number(dto.minAmount)) } });
    }
    if (dto.maxAmount) {
      and.push({ totalAmount: { lte: fromNleAmount(Number(dto.maxAmount)) } });
    }

    if (dto.from || dto.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (dto.from) {
        const fromDate = parseDateParam(dto.from);
        if (!fromDate) {
          throw new BadRequestException(
            `Invalid start date. Use YYYY-MM-DD (e.g. 2026-05-22). Received: ${dto.from}`,
          );
        }
        createdAt.gte = fromDate;
      }
      if (dto.to) {
        const toDate = parseDateParam(dto.to);
        if (!toDate) {
          throw new BadRequestException(
            `Invalid end date. Use YYYY-MM-DD (e.g. 2026-05-22). Received: ${dto.to}`,
          );
        }
        createdAt.lte = endOfDay(toDate);
      }
      and.push({ createdAt });
    }

    if (dto.status) and.push({ status: dto.status });
    if (dto.restaurantId) and.push({ restaurantId: dto.restaurantId });

    const where: Prisma.OrderWhereInput = and.length > 0 ? { AND: and } : {};

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          },
          restaurant: {
            select: { id: true, name: true, slug: true, phone: true, isOpen: true },
          },
          payment: { select: { method: true, status: true, amount: true } },
          review: { select: { rating: true, comment: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            address: true,
            isOpen: true,
            owner: { select: { firstName: true, lastName: true, phone: true, email: true } },
          },
        },
        payment: true,
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
        timeline: { orderBy: { createdAt: 'asc' } },
        rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const communications: {
      id: string;
      type: string;
      status: OrderStatus;
      message: string;
      createdAt: string;
      actor: string;
    }[] = order.timeline.map((t) => ({
      id: t.id,
      type: 'STATUS_UPDATE',
      status: t.status,
      message: t.note || `Status changed to ${t.status.replace(/_/g, ' ')}`,
      createdAt: t.createdAt.toISOString(),
      actor: t.status === OrderStatus.PLACED ? 'customer' : 'restaurant',
    }));

    if (order.review) {
      communications.push({
        id: order.review.id,
        type: 'RATING',
        status: OrderStatus.DELIVERED,
        message: order.review.comment || `Customer rated ${order.review.rating}★`,
        createdAt: order.review.createdAt.toISOString(),
        actor: 'customer',
      });
    }

    return { ...order, communications };
  }

  async getCommunications(orderId?: string, limit = 50, activityFilter?: string) {
    const orders = await this.prisma.order.findMany({
      where: orderId ? { id: orderId } : { updatedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      include: {
        restaurant: { select: { id: true, name: true } },
        customer: { select: { firstName: true, lastName: true } },
        timeline: { orderBy: { createdAt: 'desc' }, take: 15 },
        review: { select: { rating: true, comment: true, createdAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: orderId ? 1 : Math.min(Math.max(limit, 50), 200),
    });

    const feed: {
      id: string;
      orderId: string;
      orderNumber: string;
      restaurantName: string;
      customerName: string;
      message: string;
      type: string;
      status?: OrderStatus;
      orderStatus: OrderStatus;
      createdAt: string;
    }[] = [];

    const statusLabel = (s: OrderStatus) => s.replace(/_/g, ' ');

    for (const o of orders) {
      const cName = [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(' ') || 'Customer';
      const rName = o.restaurant?.name || 'Restaurant';

      for (const t of o.timeline) {
        const isPlaced = t.status === OrderStatus.PLACED;
        feed.push({
          id: `${o.id}-${t.id}`,
          orderId: o.id,
          orderNumber: o.orderNumber,
          restaurantName: rName,
          customerName: cName,
          message:
            t.note ||
            (isPlaced
              ? `${cName} placed order ${o.orderNumber} at ${rName}`
              : `${o.orderNumber}: ${statusLabel(t.status)}`),
          type: isPlaced ? 'ORDER_PLACED' : 'ORDER_UPDATE',
          status: t.status,
          orderStatus: o.status,
          createdAt: t.createdAt.toISOString(),
        });
      }

      if (o.review) {
        feed.push({
          id: `${o.id}-review`,
          orderId: o.id,
          orderNumber: o.orderNumber,
          restaurantName: rName,
          customerName: cName,
          message: o.review.comment || `${cName} rated ${rName} ${o.review.rating}★`,
          type: 'RATING',
          orderStatus: o.status,
          createdAt: o.review.createdAt.toISOString(),
        });
      }
    }

    feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filtered =
      activityFilter && activityFilter !== 'all'
        ? feed.filter((item) => this.matchesActivityFilter(item, activityFilter))
        : feed;

    return filtered.slice(0, limit);
  }

  private matchesActivityFilter(
    item: { type: string; status?: OrderStatus; orderStatus: OrderStatus },
    filter: string,
  ): boolean {
    switch (filter) {
      case 'rating':
        return item.type === 'RATING';
      case 'placed':
        return item.type === 'ORDER_PLACED' || item.status === OrderStatus.PLACED;
      case 'awaiting':
        return item.orderStatus === OrderStatus.PLACED;
      case 'accepted':
        return item.status === OrderStatus.RESTAURANT_ACCEPTED;
      case 'preparing':
        return item.status === OrderStatus.PREPARING;
      case 'ready':
        return item.status === OrderStatus.RIDER_ASSIGNED;
      case 'on_the_way':
        return item.status === OrderStatus.ON_THE_WAY;
      case 'delivered':
        return item.status === OrderStatus.DELIVERED;
      case 'cancelled':
        return item.status === OrderStatus.CANCELLED;
      case 'refunded':
        return item.status === OrderStatus.REFUNDED;
      default:
        return true;
    }
  }

  async getRestaurantById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        city: { select: { id: true, name: true, slug: true } },
        wallet: { select: { balance: true, escrowBalance: true, currency: true } },
        menuCategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: { orderBy: { name: 'asc' } },
          },
        },
        promotions: { orderBy: { createdAt: 'desc' } },
        favorites: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            menuItems: true,
            favorites: true,
            reviews: true,
          },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [orders, revenueDelivered, revenueToday, orderCustomers] = await Promise.all([
      this.prisma.order.findMany({
        where: { restaurantId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          payment: { select: { method: true, status: true, amount: true } },
          items: { select: { id: true, name: true, quantity: true, totalPrice: true } },
        },
      }),
      this.prisma.order.aggregate({
        where: { restaurantId: id, status: OrderStatus.DELIVERED },
        _sum: { subtotal: true, totalAmount: true, deliveryFee: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          restaurantId: id,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: startOfDay },
        },
        _sum: { subtotal: true, totalAmount: true },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { restaurantId: id },
        select: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
        distinct: ['customerId'],
      }),
    ]);

    type CustomerRow = {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      source: 'order' | 'favorite' | 'both';
      orderCount: number;
      favorited: boolean;
    };

    const customerMap = new Map<string, CustomerRow>();

    for (const row of orderCustomers) {
      if (!row.customer) continue;
      const c = row.customer;
      customerMap.set(c.id, {
        ...c,
        source: 'order',
        orderCount: 0,
        favorited: false,
      });
    }

    for (const order of orders) {
      if (!order.customer) continue;
      const existing = customerMap.get(order.customer.id);
      if (existing) {
        existing.orderCount += 1;
      } else {
        customerMap.set(order.customer.id, {
          ...order.customer,
          source: 'order',
          orderCount: 1,
          favorited: false,
        });
      }
    }

    for (const fav of restaurant.favorites) {
      const u = fav.user;
      const existing = customerMap.get(u.id);
      if (existing) {
        existing.favorited = true;
        existing.source = 'both';
      } else {
        customerMap.set(u.id, {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          source: 'favorite',
          orderCount: 0,
          favorited: true,
        });
      }
    }

    const { favorites, menuCategories, promotions, _count, wallet, ...restaurantCore } =
      restaurant;

    return {
      restaurant: {
        ...restaurantCore,
        walletBalance: wallet?.balance ?? 0,
        escrowBalance: wallet?.escrowBalance ?? 0,
        walletCurrency: wallet?.currency ?? 'SLE',
      },
      stats: {
        totalOrders: _count.orders,
        menuItemCount: _count.menuItems,
        favoriteCount: _count.favorites,
        reviewCount: _count.reviews,
        customerCount: customerMap.size,
        deliveredOrderCount: revenueDelivered._count,
        revenueSubtotal: revenueDelivered._sum.subtotal ?? 0,
        revenueTotal: revenueDelivered._sum.totalAmount ?? 0,
        deliveryFeesCollected: revenueDelivered._sum.deliveryFee ?? 0,
        revenueTodaySubtotal: revenueToday._sum.subtotal ?? 0,
        revenueTodayTotal: revenueToday._sum.totalAmount ?? 0,
        ordersDeliveredToday: revenueToday._count,
      },
      menuCategories,
      promotions,
      orders,
      customers: [...customerMap.values()].sort((a, b) => b.orderCount - a.orderCount),
      favorites: favorites.map((f) => ({
        id: f.id,
        createdAt: f.createdAt,
        user: f.user,
      })),
    };
  }

  listRestaurants(status?: RestaurantStatus) {
    return this.prisma.restaurant.findMany({
      where: status ? { status } : undefined,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        city: { select: { name: true, slug: true } },
        _count: {
          select: {
            orders: { where: { status: { in: ACTIVE_ORDER_STATUSES } } },
          },
        },
        orders: {
          where: { status: OrderStatus.PLACED },
          select: { id: true, orderNumber: true, createdAt: true },
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }).then((rows) =>
      rows.map((r) => ({
        ...r,
        activeOrdersCount: r._count.orders,
        pendingOrdersCount: r.orders.length,
        isActive: r.isOpen && r.status === RestaurantStatus.APPROVED,
        needsAttention: r.orders.length > 0,
      })),
    );
  }

  listRiders(status?: RiderStatus) {
    return this.prisma.rider.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  approveRestaurant(id: string) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { status: RestaurantStatus.APPROVED, isVerified: true, isOpen: true },
    });
  }

  rejectRestaurant(id: string) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { status: RestaurantStatus.REJECTED, isOpen: false },
    });
  }

  suspendRestaurant(id: string) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { status: RestaurantStatus.SUSPENDED, isOpen: false },
    });
  }

  approveRider(id: string) {
    return this.prisma.rider.update({
      where: { id },
      data: { status: RiderStatus.APPROVED },
    });
  }

  rejectRider(id: string) {
    return this.prisma.rider.update({
      where: { id },
      data: { status: RiderStatus.SUSPENDED },
    });
  }

  banUser(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isBanned: true } });
  }

  async listCustomers(q?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      role: UserRole.CUSTOMER,
      ...(q?.trim()
        ? {
            OR: [
              { email: { contains: q.trim(), mode: 'insensitive' } },
              { phone: { contains: q.trim() } },
              { firstName: { contains: q.trim(), mode: 'insensitive' } },
              { lastName: { contains: q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          loyaltyPoints: true,
          isBanned: true,
          isVerified: true,
          createdAt: true,
          city: { select: { name: true } },
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      customers: customers.map((c) => ({
        ...c,
        orderCount: c._count.orders,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPlatformSettings() {
    const cities = await this.prisma.city.findMany({
      include: { country: true, _count: { select: { restaurants: true, users: true } } },
      orderBy: { name: 'asc' },
    });
    const roles = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });
    return {
      cities,
      roleCounts: roles,
      platform: {
        defaultCurrency: 'SLE',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@saloneplate.sl',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      },
    };
  }

  updateCity(
    cityId: string,
    data: { taxRate?: number; deliveryBaseFee?: number; isActive?: boolean; name?: string },
  ) {
    return this.prisma.city.update({
      where: { id: cityId },
      data: {
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.deliveryBaseFee !== undefined && { deliveryBaseFee: data.deliveryBaseFee }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.name !== undefined && { name: data.name }),
      },
      include: { country: true },
    });
  }
}
