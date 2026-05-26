import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async initiateOrangeMoney(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, customer: true },
    });
    if (!order?.payment) throw new NotFoundException('Order not found');

    // Orange Money Sierra Leone integration architecture
    const paymentRef = `OM-${Date.now()}`;
    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.PROCESSING,
        orangeMoneyRef: paymentRef,
        providerRef: paymentRef,
      },
    });

    return {
      paymentRef,
      amount: order.totalAmount,
      currency: 'SLE',
      checkoutUrl: `${process.env.ORANGE_MONEY_API_URL}/webpayment?ref=${paymentRef}`,
      status: 'PROCESSING',
      message: 'Redirect user to Orange Money checkout',
    };
  }

  async handleOrangeMoneyCallback(ref: string, status: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orangeMoneyRef: ref },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const paymentStatus = status === 'SUCCESS' ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatus },
    });

    if (paymentStatus === PaymentStatus.COMPLETED) {
      await this.holdEscrow(payment.orderId, payment.amount);
    }

    return { success: paymentStatus === PaymentStatus.COMPLETED };
  }

  private async holdEscrow(orderId: string, amount: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: { include: { wallet: true } } },
    });
    if (!order?.restaurant.wallet) return;

    await this.prisma.wallet.update({
      where: { id: order.restaurant.wallet.id },
      data: { escrowBalance: { increment: amount * (1 - order.restaurant.commissionRate) } },
    });
  }

  async getTransactionHistory(walletId: string) {
    return this.prisma.transaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
