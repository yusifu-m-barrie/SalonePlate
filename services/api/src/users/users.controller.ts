import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateSupportTicketDto, UpdateAddressDto, UpdateUserSettingsDto } from './dto/user-settings.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.updateProfile(userId, body as Parameters<UsersService['updateProfile']>[1]);
  }

  @Post('addresses')
  addAddress(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.usersService.addAddress(userId, body as Parameters<UsersService['addAddress']>[1]);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() body: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, body);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser('id') userId: string, @Param('id') addressId: string) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Post('addresses/:id/default')
  setDefaultAddress(@CurrentUser('id') userId: string, @Param('id') addressId: string) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }

  @Get('referral')
  getReferral(@CurrentUser('id') userId: string) {
    return this.usersService.getReferralInfo(userId);
  }

  @Get('notifications')
  listNotifications(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.usersService.listNotifications(userId, Number(limit) || 40);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.usersService.markNotificationRead(userId, id);
  }

  @Post('notifications/read-all')
  markAllNotificationsRead(@CurrentUser('id') userId: string) {
    return this.usersService.markAllNotificationsRead(userId);
  }

  @Get('payments')
  getPayments(@CurrentUser('id') userId: string) {
    return this.usersService.getPaymentPreferences(userId);
  }

  @Put('payments')
  updatePayments(@CurrentUser('id') userId: string, @Body() body: UpdateUserSettingsDto) {
    return this.usersService.updateProfile(userId, { settings: body });
  }

  @Post('support')
  createSupport(@CurrentUser('id') userId: string, @Body() body: CreateSupportTicketDto) {
    return this.usersService.createSupportTicket(userId, body.subject, body.message);
  }

  @Get('support')
  listSupport(@CurrentUser('id') userId: string) {
    return this.usersService.listSupportTickets(userId);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.usersService.getDashboard(userId);
  }

  @Get('orders')
  orderHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getOrderHistory(userId, Number(page) || 1, Number(limit) || 20);
  }
}
