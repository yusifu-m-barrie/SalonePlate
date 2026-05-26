import { PrismaClient, UserRole, RestaurantStatus, RiderStatus, PromoType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SalonePlate database...');

  const country = await prisma.country.upsert({
    where: { code: 'SL' },
    update: {},
    create: { code: 'SL', name: 'Sierra Leone', currency: 'SLE' },
  });

  const makeni = await prisma.city.upsert({
    where: { slug: 'makeni' },
    update: {},
    create: {
      slug: 'makeni',
      name: 'Makeni',
      countryId: country.id,
      taxRate: 0.05,
      deliveryBaseFee: 15000,
      lat: 8.8864,
      lng: -12.0442,
      isActive: true,
    },
  });

  const freetown = await prisma.city.upsert({
    where: { slug: 'freetown' },
    update: {},
    create: {
      slug: 'freetown',
      name: 'Freetown',
      countryId: country.id,
      taxRate: 0.05,
      deliveryBaseFee: 20000,
      lat: 8.4844,
      lng: -13.2344,
      isActive: false,
    },
  });

  await prisma.deliveryZone.create({
    data: {
      cityId: makeni.id,
      name: 'Makeni Central',
      polygon: { type: 'Polygon', coordinates: [] },
      deliveryFee: 15000,
      minOrder: 50000,
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@saloneplate.sl' },
    update: {},
    create: {
      email: 'admin@saloneplate.sl',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      wallet: { create: {} },
    },
  });

  const customer = await prisma.user.upsert({
    where: { phone: '+23276123456' },
    update: {},
    create: {
      phone: '+23276123456',
      email: 'customer@demo.sl',
      passwordHash,
      firstName: 'Mohamed',
      lastName: 'Kamara',
      role: UserRole.CUSTOMER,
      cityId: makeni.id,
      isVerified: true,
      loyaltyPoints: 250,
      wallet: { create: { balance: 50000 } },
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: 'owner@mamapleskitchen.sl' },
    update: {},
    create: {
      email: 'owner@mamapleskitchen.sl',
      passwordHash,
      firstName: 'Aminata',
      lastName: 'Sesay',
      role: UserRole.RESTAURANT_OWNER,
      cityId: makeni.id,
      isVerified: true,
      wallet: { create: {} },
    },
  });

  const restaurant1 = await prisma.restaurant.upsert({
    where: { slug: 'mama-ples-kitchen' },
    update: { categories: ['african', 'rice', 'local'] },
    create: {
      ownerId: owner1.id,
      cityId: makeni.id,
      name: "Mama P's Kitchen",
      slug: 'mama-ples-kitchen',
      description: 'Authentic Sierra Leonean home cooking — cassava leaves, groundnut stew, and jollof rice.',
      coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      logoUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200',
      address: 'Kissy Road, Makeni',
      lat: 8.887,
      lng: -12.043,
      phone: '+23276111222',
      status: RestaurantStatus.APPROVED,
      isVerified: true,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 124,
      deliveryTimeMin: 25,
      deliveryTimeMax: 40,
      deliveryFee: 15000,
      minOrderAmount: 0,
      isOpen: true,
      categories: ['african', 'rice', 'local'],
      openingHours: { mon: '08:00-22:00', tue: '08:00-22:00' },
      wallet: { create: { balance: 2500000, escrowBalance: 150000 } },
    },
  });

  const cat1 = await prisma.menuCategory.create({
    data: { restaurantId: restaurant1.id, name: 'Rice Dishes', sortOrder: 1 },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant1.id,
      categoryId: cat1.id,
      name: 'Party Jollof Rice',
      description: 'Smoky party jollof with chicken, served with plantain',
      imageUrl: 'https://images.unsplash.com/photo-1603138845079-8c139d4b0e1e?w=400',
      price: 85000,
      isPopular: true,
      tags: ['popular', 'rice'],
      variants: {
        create: [
          { name: 'Regular', price: 0, isDefault: true },
          { name: 'Large', price: 25000 },
        ],
      },
      addons: {
        create: [
          { name: 'Extra Plantain', price: 10000 },
          { name: 'Fried Fish', price: 35000 },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant1.id,
      categoryId: cat1.id,
      name: 'Cassava Leaves & Rice',
      description: 'Traditional cassava leaves stew with palm oil',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      price: 75000,
      isPopular: true,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'owner@boltgrill.sl' },
    update: {},
    create: {
      email: 'owner@boltgrill.sl',
      passwordHash,
      firstName: 'Ibrahim',
      lastName: 'Bangura',
      role: UserRole.RESTAURANT_OWNER,
      cityId: makeni.id,
      isVerified: true,
      wallet: { create: {} },
    },
  });

  await prisma.restaurant.upsert({
    where: { slug: 'bolt-grill-makeni' },
    update: { categories: ['bbq', 'fast', 'european'] },
    create: {
      ownerId: owner2.id,
      cityId: makeni.id,
      name: 'Bolt Grill Makeni',
      slug: 'bolt-grill-makeni',
      description: 'Premium BBQ, grilled chicken, and fast food in Makeni',
      coverImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      address: 'Lunsar Road, Makeni',
      lat: 8.885,
      lng: -12.045,
      status: RestaurantStatus.APPROVED,
      isFeatured: true,
      rating: 4.6,
      reviewCount: 89,
      deliveryTimeMin: 20,
      deliveryTimeMax: 35,
      categories: ['bbq', 'fast', 'european'],
      wallet: { create: {} },
    },
  });

  const riderUser = await prisma.user.upsert({
    where: { phone: '+23276999888' },
    update: {},
    create: {
      phone: '+23276999888',
      email: 'rider@demo.sl',
      passwordHash,
      firstName: 'Alusine',
      lastName: 'Koroma',
      role: UserRole.RIDER,
      cityId: makeni.id,
      isVerified: true,
      wallet: { create: {} },
      rider: {
        create: {
          status: RiderStatus.APPROVED,
          vehicleType: 'motorcycle',
          rating: 4.9,
          totalDeliveries: 342,
          wallet: { create: { balance: 450000 } },
        },
      },
    },
  });

  await prisma.promotion.createMany({
    data: [
      { code: 'WELCOME20', title: '20% Off First Order', type: PromoType.FIRST_ORDER, value: 20, maxDiscount: 100000, usageLimit: 1000 },
      { code: 'FREEDEL', title: 'Free Delivery', type: PromoType.FREE_DELIVERY, value: 0, minOrder: 100000 },
      { code: 'MAKENI50', title: 'NLE 50 Off', type: PromoType.FIXED_AMOUNT, value: 50000, minOrder: 150000, cityId: makeni.id },
    ],
    skipDuplicates: true,
  });

  await prisma.banner.createMany({
    data: [
      { cityId: makeni.id, title: 'Welcome to Makeni', subtitle: 'Free delivery on orders over NLE 100', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', sortOrder: 1 },
      { cityId: makeni.id, title: 'Try Local Dishes', subtitle: 'Discover authentic Salone cuisine', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', sortOrder: 2 },
    ],
  });

  console.log('Seed complete!');
  console.log('Demo accounts (password: Password123!):');
  console.log('  Admin: admin@saloneplate.sl');
  console.log('  Customer: +23276123456 / customer@demo.sl');
  console.log('  Rider: +23276999888');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
