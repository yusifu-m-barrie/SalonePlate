import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }
}
