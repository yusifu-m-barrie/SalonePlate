import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('orange-money/:orderId')
  initiateOrangeMoney(@Param('orderId') orderId: string) {
    return this.paymentsService.initiateOrangeMoney(orderId);
  }

  @Post('orange-money/callback')
  orangeMoneyCallback(@Body() body: { ref: string; status: string }) {
    return this.paymentsService.handleOrangeMoneyCallback(body.ref, body.status);
  }

  @Get('transactions/:walletId')
  getTransactions(@Param('walletId') walletId: string) {
    return this.paymentsService.getTransactionHistory(walletId);
  }
}
