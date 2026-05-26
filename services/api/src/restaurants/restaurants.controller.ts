import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RestaurantsService } from './restaurants.service';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  @Get('discover/:citySlug')
  discover(@Param('citySlug') citySlug: string, @Query() query: Record<string, string>) {
    return this.restaurantsService.discover(citySlug, {
      lat: query.lat ? Number(query.lat) : undefined,
      lng: query.lng ? Number(query.lng) : undefined,
      category: query.category,
      cuisine: query.cuisine,
      search: query.search,
      section: query.section,
      sort: query.sort,
      restaurantId: query.restaurantId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 30,
    });
  }

  @Get('trending/:citySlug')
  trending(@Param('citySlug') citySlug: string) {
    return this.restaurantsService.getTrendingMeals(citySlug);
  }

  @Get('menu-items/:itemId')
  findMenuItem(@Param('itemId') itemId: string) {
    return this.restaurantsService.findMenuItemById(itemId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @Query('cuisine') cuisine?: string) {
    return this.restaurantsService.findBySlug(slug, cuisine);
  }

  @Post(':id/favorite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  toggleFavorite(@CurrentUser('id') userId: string, @Param('id') restaurantId: string) {
    return this.restaurantsService.toggleFavorite(userId, restaurantId);
  }
}
