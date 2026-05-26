import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId: string, cityId: string) {
    const cached = await this.prisma.aiRecommendationCache.findFirst({
      where: { userId, type: 'restaurants', expiresAt: { gt: new Date() } },
    });
    if (cached) return cached.payload;

    const orderHistory = await this.prisma.order.findMany({
      where: { customerId: userId },
      include: { restaurant: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const preferredCategories = orderHistory
      .flatMap((o: { restaurant: { categories: string[] } }) => o.restaurant.categories)
      .reduce((acc: Record<string, number>, cat: string) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topCategory = (Object.entries(preferredCategories) as [string, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const recommendations = await this.prisma.restaurant.findMany({
      where: {
        cityId,
        status: 'APPROVED',
        ...(topCategory ? { categories: { has: topCategory } } : {}),
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 10,
    });

    const payload = { recommendations, algorithm: 'collaborative-v1', etaModel: 'prep-time-heuristic' };

    await this.prisma.aiRecommendationCache.create({
      data: {
        userId,
        type: 'restaurants',
        payload,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return payload;
  }

  predictEta(restaurantId: string, distanceKm: number) {
    // Architecture for ML ETA prediction — heuristic placeholder
    const basePrep = 20;
    const travelPerKm = 3;
    const minutes = basePrep + distanceKm * travelPerKm;
    return { estimatedMinutes: Math.round(minutes), confidence: 0.85 };
  }
}
