import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PromotionsModule } from '../promotions/promotions.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PromotionsModule, forwardRef(() => RealtimeModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
