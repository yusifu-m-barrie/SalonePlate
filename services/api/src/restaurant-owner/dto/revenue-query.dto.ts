import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum RevenuePeriod {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export class RevenueQueryDto {
  @IsEnum(RevenuePeriod)
  period!: RevenuePeriod;

  /** Filter daily rows to a specific calendar year (e.g. 2026). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  /** Filter daily rows to a specific month 1–12 (requires year). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
