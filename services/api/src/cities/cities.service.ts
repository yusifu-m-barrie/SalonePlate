import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      include: { country: true, deliveryZones: { where: { isActive: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.city.findUnique({
      where: { slug },
      include: { country: true, deliveryZones: true },
    });
  }
}
