import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  RegisterSendCodeDto,
  RegisterVerifyCodeDto,
  GoogleAuthDto,
  GoogleLoginDto,
  LoginDto,
  OtpVerifyDto,
  PhoneLoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/send-code')
  @ApiOperation({ summary: 'Send email verification code before sign up' })
  sendRegisterCode(@Body() dto: RegisterSendCodeDto) {
    return this.authService.sendRegisterCode(dto);
  }

  @Post('register/verify-code')
  @ApiOperation({ summary: 'Check email verification code in real time (before sign up)' })
  verifyRegisterCode(@Body() dto: RegisterVerifyCodeDto) {
    return this.authService.verifyRegisterCode(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Complete sign up with verified email code' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('google')
  @ApiOperation({ summary: 'Sign up or sign in with Google' })
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Post('google/login')
  @ApiOperation({ summary: 'Sign in with Google (existing accounts only)' })
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.idToken);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email/phone and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('phone/request-otp')
  @ApiOperation({ summary: 'Request OTP for phone login' })
  requestOtp(@Body() dto: PhoneLoginDto) {
    return this.authService.requestPhoneOtp(dto.phone);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP code' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }
}
