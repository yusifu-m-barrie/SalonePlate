import { Module } from '@nestjs/common';
import { RidersService } from './riders.service';
import { RidersController } from './riders.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
