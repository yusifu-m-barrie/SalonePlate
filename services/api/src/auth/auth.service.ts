import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, RestaurantStatus, RiderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import {
  RegisterDto,
  RegisterSendCodeDto,
  RegisterVerifyCodeDto,
  LoginDto,
  OtpVerifyDto,
  PhoneLoginDto,
  GoogleAuthDto,
} from './dto/auth.dto';

const REGISTER_PURPOSE = 'REGISTER_EMAIL';
const RESEND_COOLDOWN_SEC = 60;
const CODE_TTL_SEC = 300;
const ALLOWED_SIGNUP_ROLES: UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.RIDER,
  UserRole.RESTAURANT_OWNER,
];

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
  }

  async sendRegisterCode(dto: RegisterSendCodeDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const lastSent = await this.prisma.otpCode.findFirst({
      where: { email, purpose: REGISTER_PURPOSE },
      orderBy: { createdAt: 'desc' },
    });
    if (lastSent) {
      const elapsedSec = Math.floor((Date.now() - lastSent.createdAt.getTime()) / 1000);
      if (elapsedSec < RESEND_COOLDOWN_SEC) {
        throw new HttpException(
          {
            message: `Please wait ${RESEND_COOLDOWN_SEC - elapsedSec}s before requesting another code`,
            retryAfter: RESEND_COOLDOWN_SEC - elapsedSec,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.prisma.otpCode.updateMany({
      where: { email, purpose: REGISTER_PURPOSE, used: false },
      data: { used: true },
    });

    const code = await this.sendOtp(email, REGISTER_PURPOSE, undefined, CODE_TTL_SEC);
    const delivery = await this.emailService.sendVerificationCode(email, code);

    const isDev = process.env.NODE_ENV !== 'production';
    const smtpConfigured = this.emailService.isSmtpConfigured();

    return {
      message: smtpConfigured
        ? 'Verification code sent to your email'
        : 'Verification code generated. Check the API server console if email is not configured.',
      email,
      expiresIn: CODE_TTL_SEC,
      retryAfter: RESEND_COOLDOWN_SEC,
      delivery,
      sentAt: new Date().toISOString(),
      ...(isDev && !smtpConfigured ? { devCode: code } : {}),
    };
  }

  async verifyRegisterCode(dto: RegisterVerifyCodeDto) {
    const email = dto.email.toLowerCase().trim();
    const code = dto.code.trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the 6-digit code from your email');
    }

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const otp = await this.findValidOtp(email, code, REGISTER_PURPOSE);
    if (!otp) {
      return { verified: false, email, message: 'Invalid or expired code' };
    }

    const expiresIn = Math.max(
      0,
      Math.floor((otp.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      verified: true,
      email,
      message: 'Email verified',
      expiresIn,
    };
  }

  async register(dto: RegisterDto) {
    this.assertSignupRole(dto.role);
    const email = dto.email.toLowerCase().trim();
    await this.verifyEmailCode(email, dto.code, REGISTER_PURPOSE);

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneExists) throw new ConflictException('Phone already registered');
    }

    const cityId = await this.resolveCityId(dto.citySlug);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referredById = await this.resolveReferrer(dto.referralCode);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        referredById,
        cityId,
        isVerified: true,
        wallet: { create: {} },
      },
    });

    await this.createRoleProfile(user.id, dto.role, cityId, dto);

    return this.generateTokens(user.id, user.role);
  }

  async googleLogin(idToken: string) {
    const profile = await this.verifyGoogleToken(idToken);
    const email = profile.email?.toLowerCase();
    if (!email) throw new BadRequestException('Google account has no email');

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email }] },
    });
    if (!user) {
      throw new UnauthorizedException('No account found. Please sign up first.');
    }
    if (user.role !== UserRole.CUSTOMER) {
      throw new UnauthorizedException(
        'Google sign-in is for customer accounts only. Use your email and password to sign in.',
      );
    }
    if (user.isBanned) throw new UnauthorizedException('Account suspended');

    if (!user.googleId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub, isVerified: true },
      });
    }

    return this.generateTokens(user.id, user.role);
  }

  async googleAuth(dto: GoogleAuthDto) {
    if (dto.role !== UserRole.CUSTOMER) {
      throw new BadRequestException('Google sign-up is only available for customer accounts');
    }
    const profile = await this.verifyGoogleToken(dto.idToken);

    const email = profile.email?.toLowerCase();
    if (!email) throw new BadRequestException('Google account has no email');

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.sub }, { email }],
      },
    });

    if (user) {
      if (user.role !== UserRole.CUSTOMER) {
        throw new UnauthorizedException(
          'This email is registered as a restaurant or rider. Sign in with email and password instead.',
        );
      }
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.sub, isVerified: true },
        });
      }
      if (user.isBanned) throw new UnauthorizedException('Account suspended');
      return this.generateTokens(user.id, user.role);
    }

    const cityId = await this.resolveCityId(dto.citySlug);
    const referredById = await this.resolveReferrer(dto.referralCode);

    user = await this.prisma.user.create({
      data: {
        email,
        googleId: profile.sub,
        firstName: dto.firstName || profile.given_name || 'User',
        lastName: dto.lastName || profile.family_name,
        phone: dto.phone,
        role: dto.role,
        referredById,
        cityId,
        isVerified: true,
        avatarUrl: profile.picture,
        wallet: { create: {} },
      },
    });

    await this.createRoleProfile(user.id, dto.role, cityId, dto);

    return this.generateTokens(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: dto.email ? { email: dto.email.toLowerCase() } : { phone: dto.phone },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException('Account suspended');

    return this.generateTokens(user.id, user.role);
  }

  async requestPhoneOtp(phone: string) {
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, role: UserRole.CUSTOMER, wallet: { create: {} } },
      });
    }
    await this.sendOtp(phone, 'LOGIN', user.id);
    return { message: 'OTP sent successfully', expiresIn: 300 };
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.email?.toLowerCase() }],
        code: dto.code,
        purpose: dto.purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const user = await this.prisma.user.findFirst({
      where: dto.phone ? { phone: dto.phone } : { email: dto.email!.toLowerCase() },
    });
    if (!user) throw new BadRequestException('User not found');

    if (dto.purpose === 'VERIFY_PHONE') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return this.generateTokens(user.id, user.role);
  }

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(stored.userId, stored.user.role);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { message: 'If account exists, reset link sent' };
    const code = await this.sendOtp(email, 'RESET_PASSWORD', user.id);
    await this.emailService.sendVerificationCode(email, code);
    return { message: 'If account exists, reset link sent' };
  }

  private async verifyGoogleToken(idToken: string) {
    if (!this.googleClient) {
      throw new BadRequestException('Google sign-in is not configured on the server');
    }
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) throw new UnauthorizedException('Invalid Google token');
    return payload;
  }

  private async findValidOtp(email: string, code: string, purpose: string) {
    return this.prisma.otpCode.findFirst({
      where: {
        email,
        code,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async verifyEmailCode(email: string, code: string, purpose: string) {
    const otp = await this.findValidOtp(email, code, purpose);
    if (!otp) throw new BadRequestException('Invalid or expired verification code');
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  }

  private assertSignupRole(role: UserRole) {
    if (!ALLOWED_SIGNUP_ROLES.includes(role)) {
      throw new BadRequestException('Invalid account type for sign up');
    }
  }

  private async resolveCityId(citySlug?: string) {
    const slug = citySlug || 'makeni';
    const city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) throw new BadRequestException(`City "${slug}" is not available`);
    if (!city.isActive) throw new BadRequestException(`City "${city.name}" is not open yet`);
    return city.id;
  }

  private async resolveReferrer(referralCode?: string) {
    if (!referralCode) return undefined;
    const referrer = await this.prisma.user.findFirst({ where: { referralCode } });
    return referrer?.id;
  }

  private slugify(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return `${base}-${Date.now().toString(36)}`;
  }

  private async createRoleProfile(
    userId: string,
    role: UserRole,
    cityId: string,
    dto: RegisterDto | GoogleAuthDto,
  ) {
    if (role === UserRole.RIDER) {
      const existing = await this.prisma.rider.findUnique({ where: { userId } });
      if (!existing) {
        await this.prisma.rider.create({
          data: {
            userId,
            cityId,
            vehicleType: dto.vehicleType || 'motorcycle',
            licenseNumber: dto.licenseNumber,
            status: RiderStatus.PENDING,
            wallet: { create: {} },
          },
        });
      }
    }

    if (role === UserRole.RESTAURANT_OWNER) {
      if (!dto.restaurantName || !dto.restaurantAddress) {
        throw new BadRequestException('Restaurant name and address are required');
      }
      const existing = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
      if (!existing) {
        const city = await this.prisma.city.findUniqueOrThrow({ where: { id: cityId } });
        await this.prisma.restaurant.create({
          data: {
            ownerId: userId,
            cityId,
            name: dto.restaurantName,
            slug: this.slugify(dto.restaurantName),
            address: dto.restaurantAddress,
            phone: dto.restaurantPhone,
            email: 'email' in dto ? dto.email : undefined,
            lat: city.lat ?? 8.8864,
            lng: city.lng ?? -12.0442,
            status: RestaurantStatus.PENDING,
            categories: [],
            wallet: { create: {} },
          },
        });
      }
    }
  }

  private async sendOtp(
    target: string,
    purpose: string,
    userId?: string,
    ttlSec = CODE_TTL_SEC,
  ) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const isEmail = target.includes('@');
    const normalized = isEmail ? target.toLowerCase() : target;
    await this.prisma.otpCode.create({
      data: {
        userId,
        phone: isEmail ? undefined : normalized,
        email: isEmail ? normalized : undefined,
        code,
        purpose,
        expiresAt: new Date(Date.now() + ttlSec * 1000),
      },
    });
    if (!isEmail && process.env.NODE_ENV === 'development') {
      console.log(`[DEV OTP] ${normalized}: ${code} (${purpose})`);
    }
    return code;
  }

  private async generateTokens(userId: string, role: UserRole) {
    const payload = { sub: userId, role };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = uuidv4();
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        loyaltyPoints: true,
        referralCode: true,
        cityId: true,
        isVerified: true,
      },
    });
    return { accessToken, refreshToken, user };
  }
}
