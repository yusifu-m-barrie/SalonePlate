import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  orderId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  foodRating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
