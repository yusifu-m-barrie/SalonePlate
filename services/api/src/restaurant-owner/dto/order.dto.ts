import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOwnerOrderStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() note?: string;
}
