/**
 * One-time helper: convert stored image URLs to relative /uploads/... paths.
 * Run from repo root: npx ts-node services/api/scripts/normalize-media-urls.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toRelative(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  const match = url.match(/\/uploads\/[^\s?#]+/);
  return match ? match[0] : url;
}

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, coverImage: true, logoUrl: true },
  });
  for (const r of restaurants) {
    await prisma.restaurant.update({
      where: { id: r.id },
      data: {
        coverImage: toRelative(r.coverImage) ?? undefined,
        logoUrl: toRelative(r.logoUrl) ?? undefined,
      },
    });
  }

  const items = await prisma.menuItem.findMany({
    select: { id: true, imageUrl: true, galleryUrls: true },
  });
  for (const item of items) {
    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        imageUrl: toRelative(item.imageUrl) ?? undefined,
        galleryUrls: item.galleryUrls.map((g) => toRelative(g) || g),
      },
    });
  }

  const banners = await prisma.banner.findMany({ select: { id: true, imageUrl: true } });
  for (const b of banners) {
    await prisma.banner.update({
      where: { id: b.id },
      data: { imageUrl: toRelative(b.imageUrl) ?? b.imageUrl },
    });
  }

  console.log('Normalized upload URLs to relative /uploads/... paths.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
