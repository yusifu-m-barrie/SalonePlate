import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RestaurantOwnerService } from './restaurant-owner.service';
import {
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from './dto/menu.dto';
import { UpdateOwnerOrderStatusDto } from './dto/order.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant.dto';
import { CreatePromotionDto, UpdatePromotionDto } from '../promotions/dto/create-promotion.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@ApiTags('Restaurant Owner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RESTAURANT_OWNER)
@Controller('restaurant-owner')
export class RestaurantOwnerController {
  constructor(private ownerService: RestaurantOwnerService) {}

  @Get('restaurant')
  getRestaurant(@CurrentUser('id') userId: string) {
    return this.ownerService.getMyRestaurant(userId);
  }

  @Patch('restaurant')
  updateRestaurant(@CurrentUser('id') userId: string, @Body() dto: UpdateRestaurantProfileDto) {
    return this.ownerService.updateRestaurantProfile(userId, dto);
  }

  @Get('promotions')
  listPromotions(@CurrentUser('id') userId: string) {
    return this.ownerService.listPromotions(userId);
  }

  @Post('promotions')
  createPromotion(@CurrentUser('id') userId: string, @Body() dto: CreatePromotionDto) {
    return this.ownerService.createPromotion(userId, dto);
  }

  @Patch('promotions/:id')
  updatePromotion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.ownerService.updatePromotion(userId, id, dto);
  }

  @Delete('promotions/:id')
  deletePromotion(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ownerService.deletePromotion(userId, id);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.ownerService.getDashboard(userId);
  }

  @Get('revenue')
  getRevenue(@CurrentUser('id') userId: string, @Query() query: RevenueQueryDto) {
    return this.ownerService.getRevenueReport(userId, query);
  }

  @Get('menu')
  getMenu(@CurrentUser('id') userId: string) {
    return this.ownerService.getMenu(userId);
  }

  @Get('menu/categories')
  getMenuCategories(@CurrentUser('id') userId: string) {
    return this.ownerService.getMenuCategoryOptions(userId);
  }

  @Post('categories')
  createCategory(@CurrentUser('id') userId: string, @Body() dto: CreateMenuCategoryDto) {
    return this.ownerService.createCategory(userId, dto);
  }

  @Post('menu/items')
  createMenuItem(@CurrentUser('id') userId: string, @Body() dto: CreateMenuItemDto) {
    return this.ownerService.createMenuItem(userId, dto);
  }

  @Patch('menu/items/:id')
  updateMenuItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.ownerService.updateMenuItem(userId, id, dto);
  }

  @Delete('menu/items/:id')
  deleteMenuItem(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ownerService.deleteMenuItem(userId, id);
  }

  @Get('orders')
  getOrders(@CurrentUser('id') userId: string, @Query('status') status?: OrderStatus) {
    return this.ownerService.getOrders(userId, status);
  }

  @Get('orders/:id')
  getOrder(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ownerService.getOrder(userId, id);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOwnerOrderStatusDto,
  ) {
    return this.ownerService.updateOrderStatus(userId, id, dto);
  }
}
