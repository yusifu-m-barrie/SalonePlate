import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterSendCodeDto {
  @IsEmail() email!: string;
}

export class RegisterVerifyCodeDto {
  @IsEmail() email!: string;
  @IsString() code!: string;
}

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() code!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() firstName!: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsOptional() @IsString() referralCode?: string;
  @IsOptional() @IsString() citySlug?: string;

  @ValidateIf((o) => o.role === UserRole.RESTAURANT_OWNER)
  @IsString()
  restaurantName?: string;

  @ValidateIf((o) => o.role === UserRole.RESTAURANT_OWNER)
  @IsString()
  restaurantAddress?: string;

  @IsOptional() @IsString() restaurantPhone?: string;

  @ValidateIf((o) => o.role === UserRole.RIDER)
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ValidateIf((o) => o.role === UserRole.RIDER)
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}

export class GoogleLoginDto {
  @IsString() idToken!: string;
}

export class GoogleAuthDto {
  @IsString() idToken!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() referralCode?: string;
  @IsOptional() @IsString() citySlug?: string;

  @ValidateIf((o) => o.role === UserRole.RESTAURANT_OWNER)
  @IsString()
  restaurantName?: string;

  @ValidateIf((o) => o.role === UserRole.RESTAURANT_OWNER)
  @IsString()
  restaurantAddress?: string;

  @IsOptional() @IsString() restaurantPhone?: string;

  @ValidateIf((o) => o.role === UserRole.RIDER)
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ValidateIf((o) => o.role === UserRole.RIDER)
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}

export class LoginDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(1) password!: string;
}

export class PhoneLoginDto {
  @IsString() phone!: string;
}

export class OtpVerifyDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() code!: string;
  @IsString() purpose!: string;
}

export class RefreshTokenDto {
  @IsString() refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail() email!: string;
}
