import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  getBanners(cityId?: string) {
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: cityId ? [{ cityId }, { cityId: null }] : [{ cityId: null }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listAllBanners() {
    return this.prisma.banner.findMany({
      include: { city: { select: { name: true, slug: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private async nextTopSortOrder(): Promise<number> {
    const { _min } = await this.prisma.banner.aggregate({ _min: { sortOrder: true } });
    return (_min.sortOrder ?? 0) - 1;
  }

  async createBanner(data: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    cityId?: string;
    linkUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
    expiresAt?: string;
  }) {
    const sortOrder =
      data.sortOrder != null && data.sortOrder !== 0
        ? data.sortOrder
        : await this.nextTopSortOrder();

    return this.prisma.banner.create({
      data: {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim(),
        imageUrl: data.imageUrl,
        cityId: data.cityId || null,
        linkUrl: data.linkUrl,
        sortOrder,
        isActive: data.isActive ?? true,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      include: { city: { select: { name: true } } },
    });
  }

  async updateBanner(
    id: string,
    data: Partial<{
      title: string;
      subtitle: string;
      imageUrl: string;
      linkUrl: string;
      sortOrder: number;
      isActive: boolean;
      cityId: string | null;
      expiresAt: string | null;
    }>,
  ) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle?.trim() }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
        ...(data.expiresAt !== undefined && {
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        }),
      },
      include: { city: { select: { name: true } } },
    });
  }

  async deleteBanner(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.prisma.banner.delete({ where: { id } });
    return { deleted: true };
  }

  getFeaturedRestaurants(cityId: string) {
    return this.prisma.restaurant.findMany({
      where: { cityId, isFeatured: true, status: 'APPROVED' },
    });
  }
}
