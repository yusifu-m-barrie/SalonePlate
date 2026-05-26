import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRestaurantProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  isBusy?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  deliveryTimeMin?: number;

  @IsOptional()
  @IsNumber()
  deliveryTimeMax?: number;

  @IsOptional()
  @IsObject()
  openingHours?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
