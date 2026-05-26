import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class SearchOrdersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  food?: string;

  @IsOptional()
  @IsNumberString()
  minAmount?: string;

  @IsOptional()
  @IsNumberString()
  maxAmount?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
