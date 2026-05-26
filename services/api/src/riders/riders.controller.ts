import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RidersService } from './riders.service';

@ApiTags('Riders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
@Controller('riders')
export class RidersController {
  constructor(private ridersService: RidersService) {}

  @Patch('online')
  toggleOnline(@CurrentUser('riderId') riderId: string, @Body() body: { isOnline: boolean }) {
    return this.ridersService.toggleOnline(riderId, body.isOnline);
  }

  @Patch('location')
  updateLocation(@CurrentUser('riderId') riderId: string, @Body() body: { lat: number; lng: number }) {
    return this.ridersService.updateLocation(riderId, body.lat, body.lng);
  }

  @Get('orders/available')
  getAvailableOrders(@CurrentUser('cityId') cityId?: string) {
    return this.ridersService.getAvailableOrders(cityId);
  }

  @Post('orders/:orderId/accept')
  acceptOrder(@CurrentUser('riderId') riderId: string, @Param('orderId') orderId: string) {
    return this.ridersService.acceptOrder(riderId, orderId);
  }

  @Get('earnings')
  getEarnings(@CurrentUser('riderId') riderId: string) {
    return this.ridersService.getEarnings(riderId);
  }

  @Post('withdraw')
  withdraw(@CurrentUser('riderId') riderId: string, @Body() body: { amount: number; method: string; accountDetails: Record<string, unknown> }) {
    return this.ridersService.requestWithdrawal(riderId, body.amount, body.method, body.accountDetails);
  }
}
