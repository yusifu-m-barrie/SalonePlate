import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  findActive(@Query('cityId') cityId?: string, @Query('restaurantId') restaurantId?: string) {
    return this.promotionsService.findActive(cityId, restaurantId);
  }

  @Get('validate/:code')
  preview(
    @Param('code') code: string,
    @Query('subtotal') subtotal: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    return this.promotionsService.preview(code, Number(subtotal), restaurantId);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  listAllAdmin() {
    return this.promotionsService.listAllWithUsageStats();
  }

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  createAdmin(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  updateAdmin(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  removeAdmin(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
