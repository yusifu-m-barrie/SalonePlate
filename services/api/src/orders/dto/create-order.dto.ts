import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { DeliveryAddressDto } from './delivery-address.dto';

class OrderItemDto {
  @IsString() menuItemId!: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() variantId?: string;
  @IsOptional() @IsArray() addonIds?: string[];
  @IsOptional() @IsString() specialInstructions?: string;
}

export class CreateOrderDto {
  @IsString() restaurantId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @ValidateNested() @Type(() => DeliveryAddressDto) deliveryAddress!: DeliveryAddressDto;
  @IsOptional() @IsString() deliveryInstructions?: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() promoCode?: string;
  @IsOptional() @IsNumber() tipAmount?: number;
}
