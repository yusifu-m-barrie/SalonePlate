import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, MenuVariant, MenuAddon, Prisma, PromoType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { formatCurrency } from '../common/utils/currency';
import { haversineKm } from '../common/utils/geo';
import { calculateDistanceDeliveryFee, DELIVERY_PRICING } from '../common/constants/delivery-pricing';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private promotions: PromotionsService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtime: RealtimeGateway,
  ) {}

  private resolveDeliveryFee(
    restaurant: { lat: number; lng: number; deliveryFee: number | null; city: { deliveryBaseFee: number } },
    deliveryLat: number,
    deliveryLng: number,
  ) {
    const distanceKm = haversineKm(
      { lat: restaurant.lat, lng: restaurant.lng },
      { lat: deliveryLat, lng: deliveryLng },
    );

    const baseFee = restaurant.deliveryFee ?? restaurant.city.deliveryBaseFee;
    const deliveryFee = calculateDistanceDeliveryFee(baseFee, distanceKm);

    return { deliveryFee, distanceKm, baseFee };
  }

  async getDeliveryQuote(restaurantId: string, lat: number, lng: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { city: true },
    });
    if (!restaurant || !restaurant.isOpen) {
      throw new BadRequestException('Restaurant is not available');
    }

    const { deliveryFee, distanceKm, baseFee } = this.resolveDeliveryFee(restaurant, lat, lng);

    return {
      restaurantId,
      deliveryFee,
      distanceKm: Math.round(distanceKm * 10) / 10,
      baseFee,
      includedKm: DELIVERY_PRICING.INCLUDED_DISTANCE_KM,
      feePerKm: DELIVERY_PRICING.FEE_PER_KM,
    };
  }

  async create(customerId: string, dto: CreateOrderDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
      include: { city: true },
    });
    if (!restaurant || !restaurant.isOpen) {
      throw new BadRequestException('Restaurant is not available');
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of dto.items) {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: { variants: true, addons: true },
      });
      if (!menuItem || !menuItem.isAvailable) {
        throw new BadRequestException(`Item ${item.menuItemId} unavailable`);
      }

      let unitPrice = menuItem.price;
      let variantName: string | undefined;

      if (item.variantId) {
        const variant = menuItem.variants.find((v: MenuVariant) => v.id === item.variantId);
        if (variant) {
          unitPrice += variant.price;
          variantName = variant.name;
        }
      }

      let addonsTotal = 0;
      const selectedAddons: { name: string; price: number; qty: number }[] = [];
      if (item.addonIds?.length) {
        for (const addonId of item.addonIds) {
          const addon = menuItem.addons.find((a: MenuAddon) => a.id === addonId);
          if (addon) {
            addonsTotal += addon.price;
            selectedAddons.push({ name: addon.name, price: addon.price, qty: 1 });
          }
        }
      }

      unitPrice += addonsTotal;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        variantName,
        addons: selectedAddons.length ? selectedAddons : undefined,
        specialInstructions: item.specialInstructions,
      });
    }

    if (subtotal <= 0) {
      throw new BadRequestException('Add at least one item to your order');
    }

    if (restaurant.minOrderAmount > 0 && subtotal < restaurant.minOrderAmount) {
      throw new BadRequestException(`Minimum order is ${formatCurrency(restaurant.minOrderAmount)}`);
    }

    const { deliveryFee, distanceKm } = this.resolveDeliveryFee(
      restaurant,
      dto.deliveryAddress.lat,
      dto.deliveryAddress.lng,
    );
    const taxAmount = subtotal * restaurant.city.taxRate;
    let discountAmount = 0;
    let freeDelivery = false;

    if (dto.promoCode) {
      const promo = await this.promotions.validateAndApply(dto.promoCode, subtotal, restaurant.id);
      if (promo.promo.type === PromoType.FREE_DELIVERY) {
        freeDelivery = true;
      } else {
        discountAmount = promo.discount;
      }
    }

    const finalDeliveryFee = freeDelivery ? 0 : deliveryFee;

    const tipAmount = dto.tipAmount || 0;
    const totalAmount = subtotal + finalDeliveryFee + taxAmount - discountAmount + tipAmount;

    const orderNumber = `SP-${Date.now().toString(36).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId,
        restaurantId: restaurant.id,
        subtotal,
        deliveryFee: finalDeliveryFee,
        taxAmount,
        discountAmount,
        tipAmount,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        deliveryAddress: {
          ...dto.deliveryAddress,
          distanceKm: Math.round(distanceKm * 10) / 10,
        } as Prisma.InputJsonValue,
        deliveryInstructions: dto.deliveryInstructions,
        promoCode: dto.promoCode,
        estimatedDeliveryAt: new Date(Date.now() + restaurant.deliveryTimeMax * 60 * 1000),
        items: { create: orderItems },
        timeline: { create: { status: OrderStatus.PLACED, note: 'Order placed' } },
        payment: {
          create: {
            method: dto.paymentMethod,
            amount: totalAmount,
            status:
              dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                ? PaymentStatus.PENDING
                : PaymentStatus.PENDING,
          },
        },
      },
      include: { items: true, restaurant: true, timeline: true, payment: true },
    });

    this.realtime.emitOrderUpdate(order.id, {
      status: OrderStatus.PLACED,
      order,
    });
    this.realtime.emitToRestaurant(restaurant.id, 'new_order', order);
    this.realtime.emitToRestaurant(restaurant.id, 'owner_notification', {
      type: 'NEW_ORDER',
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: `New order ${order.orderNumber}`,
      createdAt: order.createdAt,
    });
    this.emitCustomerNotification(order.customerId, {
      type: 'ORDER_PLACED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: OrderStatus.PLACED,
      restaurantName: restaurant.name,
      message: `Order placed at ${restaurant.name}`,
      createdAt: order.createdAt.toISOString(),
    });
    this.emitAdminNotification({
      type: 'NEW_ORDER',
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      message: `New order ${order.orderNumber} at ${restaurant.name} — notify restaurant if no response`,
      createdAt: order.createdAt.toISOString(),
      status: OrderStatus.PLACED,
    });

    return order;
  }

  private readonly customerStatusMessages: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.PLACED]: 'Your order was placed successfully.',
    [OrderStatus.RESTAURANT_ACCEPTED]: 'The restaurant confirmed your order.',
    [OrderStatus.PREPARING]: 'Your food is being prepared.',
    [OrderStatus.RIDER_ASSIGNED]: 'Your order is ready for delivery.',
    [OrderStatus.ON_THE_WAY]: 'Your order is on the way to you.',
    [OrderStatus.DELIVERED]: 'Your order has been delivered. Enjoy your meal!',
    [OrderStatus.CANCELLED]: 'This order was cancelled.',
  };

  private emitCustomerNotification(
    customerId: string,
    payload: {
      type: string;
      orderId: string;
      orderNumber: string;
      status?: OrderStatus;
      restaurantName?: string;
      message: string;
      createdAt: string;
    },
  ) {
    this.realtime.emitToCustomer(customerId, 'customer_notification', payload);
    void this.prisma.notification
      .create({
        data: {
          userId: customerId,
          title: payload.restaurantName ? `${payload.restaurantName}` : 'SalonePlate',
          body: payload.message,
          type: payload.type,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            status: payload.status,
          },
        },
      })
      .catch(() => undefined);
  }

  private emitAdminNotification(payload: {
    type: string;
    orderId: string;
    orderNumber: string;
    restaurantId?: string;
    restaurantName?: string;
    message: string;
    createdAt: string;
    status?: OrderStatus;
  }) {
    this.realtime.emitToAdmin('admin_notification', payload);
  }

  async findOne(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ customerId: userId }, { restaurant: { ownerId: userId } }, { rider: { userId } }] },
      include: {
        items: true,
        restaurant: true,
        rider: { include: { user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } } },
        timeline: { orderBy: { createdAt: 'asc' } },
        payment: true,
        review: { select: { id: true, rating: true, comment: true, createdAt: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus, actorId: string, note?: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        deliveredAt: status === OrderStatus.DELIVERED ? new Date() : undefined,
        timeline: { create: { status, note } },
      },
      include: { customer: true, restaurant: true, rider: true, payment: true },
    });

    if (status === OrderStatus.DELIVERED && order.payment) {
      if (order.payment.method === PaymentMethod.CASH_ON_DELIVERY) {
        await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.COMPLETED },
        });
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
      }
    }

    this.realtime.emitOrderUpdate(orderId, { status, order });

    const ownerType =
      status === OrderStatus.DELIVERED
        ? 'DELIVERED'
        : status === OrderStatus.PLACED
          ? 'NEW_ORDER'
          : 'STATUS_UPDATE';
    this.realtime.emitToRestaurant(order.restaurantId, 'owner_notification', {
      type: ownerType,
      orderId,
      orderNumber: order.orderNumber,
      status,
      message:
        status === OrderStatus.DELIVERED
          ? `Customer confirmed delivery — ${order.orderNumber}`
          : `Order ${order.orderNumber} updated`,
      createdAt: new Date().toISOString(),
    });
    if (status === OrderStatus.DELIVERED && order.payment) {
      this.realtime.emitToRestaurant(order.restaurantId, 'owner_notification', {
        type: 'PAYMENT',
        orderId,
        orderNumber: order.orderNumber,
        message: `Payment received for ${order.orderNumber}`,
        createdAt: new Date().toISOString(),
      });
    }

    const customerType =
      status === OrderStatus.DELIVERED
        ? 'DELIVERED'
        : status === OrderStatus.CANCELLED
          ? 'CANCELLED'
          : 'ORDER_UPDATE';
    this.emitCustomerNotification(order.customerId, {
      type: customerType,
      orderId,
      orderNumber: order.orderNumber,
      status,
      restaurantName: order.restaurant?.name,
      message:
        this.customerStatusMessages[status] ||
        `Order ${order.orderNumber} was updated`,
      createdAt: new Date().toISOString(),
    });
    this.emitAdminNotification({
      type: customerType,
      orderId,
      orderNumber: order.orderNumber,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurant?.name,
      message: `${order.orderNumber}: ${note || status.replace(/_/g, ' ')} (${order.restaurant?.name})`,
      createdAt: new Date().toISOString(),
      status,
    });

    return order;
  }

  async confirmDelivery(orderId: string, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.DELIVERED) {
      return this.findOne(orderId, customerId);
    }
    if (order.status !== OrderStatus.ON_THE_WAY) {
      throw new BadRequestException('You can confirm delivery once your order is on the way');
    }
    return this.updateStatus(orderId, OrderStatus.DELIVERED, customerId, 'Confirmed by customer');
  }

  async getLiveOrders(cityId?: string) {
    return this.prisma.order.findMany({
      where: {
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        ...(cityId ? { restaurant: { cityId } } : {}),
      },
      include: { restaurant: true, customer: true, rider: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
