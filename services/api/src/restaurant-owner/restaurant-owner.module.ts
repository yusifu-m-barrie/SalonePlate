import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RestaurantOwnerController } from './restaurant-owner.controller';
import { RestaurantOwnerService } from './restaurant-owner.service';

@Module({
  imports: [OrdersModule, PromotionsModule],
  controllers: [RestaurantOwnerController],
  providers: [RestaurantOwnerService],
})
export class RestaurantOwnerModule {}
