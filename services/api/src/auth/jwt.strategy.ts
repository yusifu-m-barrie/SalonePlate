import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { restaurant: true, rider: true },
    });
    if (!user || user.isBanned) {
      throw new UnauthorizedException('Account suspended or not found');
    }
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cityId: user.cityId,
      restaurantId: user.restaurant?.id,
      riderId: user.rider?.id,
    };
  }
}
