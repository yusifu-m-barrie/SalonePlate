import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PromoType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PromoType)
  type!: PromoType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PromoType)
  type?: PromoType;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsNumber()
  minOrder?: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
