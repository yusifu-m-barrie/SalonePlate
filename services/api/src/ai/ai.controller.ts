import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('recommendations')
  getRecommendations(@CurrentUser('id') userId: string, @Query('cityId') cityId: string) {
    return this.aiService.getRecommendations(userId, cityId);
  }

  @Get('eta/:restaurantId')
  predictEta(@Param('restaurantId') restaurantId: string, @Query('distance') distance: string) {
    return this.aiService.predictEta(restaurantId, Number(distance) || 2);
  }
}
