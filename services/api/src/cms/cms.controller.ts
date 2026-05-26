import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CmsService } from './cms.service';

@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private cmsService: CmsService) {}

  @Get('banners')
  getBanners(@Query('cityId') cityId?: string) {
    return this.cmsService.getBanners(cityId);
  }

  @Get('banners/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  listAllBanners() {
    return this.cmsService.listAllBanners();
  }

  @Post('banners')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  createBanner(@Body() body: Record<string, unknown>) {
    return this.cmsService.createBanner(body as Parameters<CmsService['createBanner']>[0]);
  }

  @Patch('banners/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  updateBanner(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.cmsService.updateBanner(id, body as Parameters<CmsService['updateBanner']>[1]);
  }

  @Delete('banners/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CITY_MANAGER)
  deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(id);
  }
}
