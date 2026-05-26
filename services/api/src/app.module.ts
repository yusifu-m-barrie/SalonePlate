import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MediaUrlInterceptor } from './common/media-url.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CitiesModule } from './cities/cities.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RidersModule } from './riders/riders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { CmsModule } from './cms/cms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { RealtimeModule } from './realtime/realtime.module';
import { UploadsModule } from './uploads/uploads.module';
import { RestaurantOwnerModule } from './restaurant-owner/restaurant-owner.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CitiesModule,
    RestaurantsModule,
    OrdersModule,
    PaymentsModule,
    PromotionsModule,
    RidersModule,
    ReviewsModule,
    AdminModule,
    CmsModule,
    NotificationsModule,
    AiModule,
    RealtimeModule,
    UploadsModule,
    RestaurantOwnerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: MediaUrlInterceptor },
  ],
})
export class AppModule {}
