import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { InitiateOrangeMoneyDto } from './dto/initiate-orange-money.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('orange-money/config')
  getOrangeMoneyConfig() {
    return this.paymentsService.getOrangeMoneyConfigPublic();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('orange-money/:orderId/status')
  getOrangeMoneyStatus(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.paymentsService.getOrangeMoneyPaymentStatus(userId, orderId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('orange-money/:orderId')
  initiateOrangeMoney(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: InitiateOrangeMoneyDto,
  ) {
    return this.paymentsService.initiateOrangeMoney(userId, orderId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('orange-money/:orderId/simulate-complete')
  simulateComplete(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.paymentsService.simulateOrangeMoneyComplete(userId, orderId);
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
