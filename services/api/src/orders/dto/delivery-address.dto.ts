import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DeliveryAddressDto {
  @IsString() label!: string;
  @IsString() street!: string;
  @IsString() city!: string;
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsString() instructions?: string;
}
