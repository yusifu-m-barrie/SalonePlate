import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RiderStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService) {}

  async toggleOnline(riderId: string, isOnline: boolean) {
    return this.prisma.rider.update({
      where: { id: riderId },
      data: { isOnline, status: isOnline ? RiderStatus.ONLINE : RiderStatus.OFFLINE },
    });
  }

  async updateLocation(riderId: string, lat: number, lng: number) {
    return this.prisma.rider.update({
      where: { id: riderId },
      data: { currentLat: lat, currentLng: lng },
    });
  }

  async getAvailableOrders(cityId?: string) {
    return this.prisma.order.findMany({
      where: {
        status: 'RESTAURANT_ACCEPTED',
        riderId: null,
        ...(cityId ? { restaurant: { cityId } } : {}),
      },
      include: { restaurant: true, items: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
  }

  async getEarnings(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      include: { wallet: true, orders: { where: { status: 'DELIVERED' }, select: { tipAmount: true, deliveryFee: true } } },
    });
    if (!rider) throw new NotFoundException('Rider not found');

    const totalDeliveries = rider.totalDeliveries;
    const totalTips = rider.orders.reduce((s: number, o: { tipAmount: number }) => s + o.tipAmount, 0);
    const walletBalance = rider.wallet?.balance ?? 0;

    return { totalDeliveries, totalTips, walletBalance, recentOrders: rider.orders.slice(0, 10) };
  }

  async requestWithdrawal(riderId: string, amount: number, method: string, accountDetails: Record<string, unknown>) {
    return this.prisma.withdrawalRequest.create({
      data: { riderId, amount, method: method as never, accountDetails: accountDetails as Prisma.InputJsonValue },
    });
  }

  async acceptOrder(riderId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, status: OrderStatus.RESTAURANT_ACCEPTED, riderId: null },
    });
    if (!order) throw new BadRequestException('Order is no longer available');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        riderId,
        status: OrderStatus.RIDER_ASSIGNED,
        timeline: { create: { status: OrderStatus.RIDER_ASSIGNED, note: 'Rider accepted order' } },
      },
      include: { restaurant: true, items: true },
    });
  }
}
