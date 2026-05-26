import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true || value === 1 || value === '1') return true;
  if (value === 'false' || value === false || value === 0 || value === '0') return false;
  return value;
};

export class CreateMenuCategoryDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class CreateMenuItemDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) price!: number;
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) galleryUrls?: string[];
  @IsOptional() @IsNumber() @Min(0) compareAtPrice?: number;
  @IsOptional() @IsNumber() @Min(1) prepTimeMin?: number;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isAvailable?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isPopular?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateMenuItemDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() categoryId?: string | null;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) galleryUrls?: string[];
  @IsOptional() @IsNumber() @Min(0) compareAtPrice?: number;
  @IsOptional() @IsNumber() @Min(1) prepTimeMin?: number;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isAvailable?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isPopular?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
