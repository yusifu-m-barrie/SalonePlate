import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [RealtimeModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
