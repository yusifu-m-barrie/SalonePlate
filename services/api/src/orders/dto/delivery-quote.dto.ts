import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryQuoteDto {
  @IsString() restaurantId!: string;

  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}
