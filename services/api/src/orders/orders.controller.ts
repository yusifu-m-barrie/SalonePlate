import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeliveryQuoteDto } from './dto/delivery-quote.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('quote/delivery')
  getDeliveryQuote(@Query() query: DeliveryQuoteDto) {
    return this.ordersService.getDeliveryQuote(query.restaurantId, query.lat, query.lng);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Post(':id/confirm-delivery')
  confirmDelivery(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.confirmDelivery(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.RIDER, UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; note?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, userId, body.note);
  }
}
