import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Review } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customerId: userId },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can rate an order after it has been delivered');
    }
    if (order.review) {
      throw new BadRequestException('You have already rated this order');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        orderId: dto.orderId,
        restaurantId: order.restaurantId,
        rating: dto.rating,
        foodRating: dto.foodRating ?? dto.rating,
        comment: dto.comment?.trim() || undefined,
        isVerified: true,
      },
    });

    const reviews = await this.prisma.review.findMany({ where: { restaurantId: order.restaurantId } });
    const avg = reviews.reduce((s: number, r: Review) => s + r.rating, 0) / reviews.length;
    await this.prisma.restaurant.update({
      where: { id: order.restaurantId },
      data: { rating: avg, reviewCount: reviews.length },
    });

    const orderRow = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { orderNumber: true },
    });

    this.realtime.emitToRestaurant(order.restaurantId, 'owner_notification', {
      type: 'RATING',
      orderId: dto.orderId,
      orderNumber: orderRow?.orderNumber,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
      message: `New ${dto.rating}★ rating on ${orderRow?.orderNumber || 'order'}`,
      createdAt: review.createdAt.toISOString(),
    });
    this.realtime.emitToAdmin('admin_notification', {
      type: 'RATING',
      orderId: dto.orderId,
      orderNumber: orderRow?.orderNumber,
      message: `Customer left ${dto.rating}★ on ${orderRow?.orderNumber}`,
      createdAt: review.createdAt.toISOString(),
    });

    return review;
  }
}
