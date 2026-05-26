import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  promos?: boolean;

  @IsOptional()
  @IsIn(['ORANGE_MONEY', 'AIRTEL_MONEY', 'CASH_ON_DELIVERY', 'CARD', 'WALLET'])
  defaultPaymentMethod?: string;

  @IsOptional()
  @IsString()
  orangeMoneyPhone?: string;
}

export class CreateSupportTicketDto {
  @IsString()
  subject: string;

  @IsString()
  message: string;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  instructions?: string;
}
