import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class InitiateOrangeMoneyDto {
  /** Customer Orange Money MSISDN (+232… or 07…). */
  @IsString()
  @MinLength(8)
  phone!: string;

  /** Amount the customer typed in NLE (must match order total). */
  @IsNumber()
  @Min(0.01)
  amountNle!: number;
}
