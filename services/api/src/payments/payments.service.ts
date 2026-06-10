import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InitiateOrangeMoneyDto } from './dto/initiate-orange-money.dto';
import {
  buildOrangeSmsMessage,
  formatNle,
  getOrangeMoneyConfig,
  normalizeOrangePhone,
  nleToStored,
} from './orange-money.util';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  getOrangeMoneyConfigPublic() {
    const cfg = getOrangeMoneyConfig();
    return {
      merchantName: cfg.merchantName,
      merchantMsisdn: cfg.merchantMsisdn,
      ussdCode: cfg.ussdCode,
      currency: cfg.currency,
      instructions: [
        'Enter your Orange Money number below.',
        'Type the exact order total in the amount field.',
        'Tap PAY NOW — you will receive a prompt on your phone.',
        `Dial ${cfg.ussdCode} and follow the instructions to approve the payment.`,
      ],
    };
  }

  async getOrangeMoneyPaymentStatus(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: { payment: true },
    });
    if (!order?.payment) throw new NotFoundException('Order not found');

    const meta = (order.payment.metadata as Record<string, unknown> | null) || {};
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      payment: {
        status: order.payment.status,
        method: order.payment.method,
        amount: order.payment.amount,
        orangeMoneyRef: order.payment.orangeMoneyRef,
        smsMessage: meta.smsMessage as string | undefined,
        ussdCode: meta.ussdCode as string | undefined,
      },
    };
  }

  async initiateOrangeMoney(userId: string, orderId: string, dto: InitiateOrangeMoneyDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: { payment: true, customer: true },
    });
    if (!order?.payment) throw new NotFoundException('Order not found');

    if (order.payment.method !== PaymentMethod.ORANGE_MONEY) {
      throw new BadRequestException('This order is not an Orange Money payment');
    }
    if (order.payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('This order is already paid');
    }

    const expectedStored = order.totalAmount;
    const enteredStored = nleToStored(dto.amountNle);
    if (enteredStored !== expectedStored) {
      throw new BadRequestException(
        `Amount must be exactly NLE ${formatNle(expectedStored)}. You entered NLE ${formatNle(enteredStored)}.`,
      );
    }

    const phone = normalizeOrangePhone(dto.phone);
    if (!/^\+232\d{8,9}$/.test(phone)) {
      throw new BadRequestException('Enter a valid Sierra Leone Orange Money number (+232XXXXXXXX)');
    }
    const cfg = getOrangeMoneyConfig();
    const amountLabel = formatNle(expectedStored);
    const paymentRef = `OM-${Date.now()}-${order.orderNumber}`;
    const smsMessage = buildOrangeSmsMessage(amountLabel, cfg.merchantName, cfg.merchantMsisdn);

    await this.sendOrangeMoneyPush(phone, smsMessage, {
      ref: paymentRef,
      amountNle: amountLabel,
      merchantName: cfg.merchantName,
    });

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.PROCESSING,
        orangeMoneyRef: paymentRef,
        providerRef: paymentRef,
        metadata: {
          orangeMoneyPhone: phone,
          amountNle: dto.amountNle,
          smsMessage,
          ussdCode: cfg.ussdCode,
          initiatedAt: new Date().toISOString(),
          simulate: cfg.simulate,
        },
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.PROCESSING },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...((order.customer.settings as Record<string, unknown>) || {}),
          orangeMoneyPhone: phone,
        },
      },
    });

    return {
      paymentRef,
      phone,
      amount: expectedStored,
      amountNle: amountLabel,
      currency: cfg.currency,
      status: PaymentStatus.PROCESSING,
      ussdCode: cfg.ussdCode,
      smsMessage,
      message: `Payment request sent to ${phone}. ${smsMessage}`,
      merchantName: cfg.merchantName,
      merchantMsisdn: cfg.merchantMsisdn,
      simulate: cfg.simulate,
    };
  }

  /** Push payment instruction to customer (Orange API or simulated log). */
  private async sendOrangeMoneyPush(
    phone: string,
    smsMessage: string,
    payload: { ref: string; amountNle: string; merchantName: string },
  ) {
    const cfg = getOrangeMoneyConfig();

    if (cfg.apiUrl && process.env.ORANGE_MONEY_CLIENT_ID) {
      // Production: replace with Orange Money WebPay / merchant push API call.
      console.info('[OrangeMoney] API push', { phone, ref: payload.ref, amount: payload.amountNle });
      return;
    }

    if (cfg.simulate) {
      console.info('[OrangeMoney] SIMULATED SMS →', phone, smsMessage);
      return;
    }

    throw new BadRequestException(
      'Orange Money is not configured. Set ORANGE_MONEY_API_URL and credentials on the server.',
    );
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

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus },
    });

    if (paymentStatus === PaymentStatus.COMPLETED) {
      await this.holdEscrow(payment.orderId, payment.amount);
    }

    return { success: paymentStatus === PaymentStatus.COMPLETED };
  }

  /** Dev / simulate: mark Orange Money payment complete (when ORANGE_MONEY_SIMULATE=true). */
  async simulateOrangeMoneyComplete(userId: string, orderId: string) {
    const cfg = getOrangeMoneyConfig();
    if (!cfg.simulate) {
      throw new ForbiddenException('Simulation is disabled in production');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: { payment: true },
    });
    if (!order?.payment?.orangeMoneyRef) {
      throw new BadRequestException('Start payment first with PAY NOW');
    }

    return this.handleOrangeMoneyCallback(order.payment.orangeMoneyRef, 'SUCCESS');
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
