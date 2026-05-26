-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'RESTAURANT_OWNER', 'RIDER', 'CITY_MANAGER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'RESTAURANT_ACCEPTED', 'PREPARING', 'RIDER_ASSIGNED', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ORANGE_MONEY', 'AIRTEL_MONEY', 'CASH_ON_DELIVERY', 'CARD', 'WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY', 'FIRST_ORDER', 'REFERRAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'REFUND', 'PAYOUT_RESTAURANT', 'PAYOUT_RIDER', 'WITHDRAWAL', 'TOP_UP', 'ESCROW_HOLD', 'ESCROW_RELEASE');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'en',
    "cityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SLL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "deliveryBaseFee" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "polygon" JSONB NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "logoUrl" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryTimeMin" INTEGER NOT NULL DEFAULT 30,
    "deliveryTimeMax" INTEGER NOT NULL DEFAULT 45,
    "deliveryFee" DOUBLE PRECISION,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "isBusy" BOOLEAN NOT NULL DEFAULT false,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "categories" TEXT[],
    "openingHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "prepTimeMin" INTEGER NOT NULL DEFAULT 15,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuVariant" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MenuVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuAddon" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "maxQty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MenuAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityId" TEXT,
    "vehicleType" TEXT NOT NULL DEFAULT 'motorcycle',
    "licenseNumber" TEXT,
    "status" "RiderStatus" NOT NULL DEFAULT 'PENDING',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "riderId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" JSONB NOT NULL,
    "deliveryInstructions" TEXT,
    "estimatedDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "promoCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "variantName" TEXT,
    "addons" JSONB,
    "specialInstructions" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTimeline" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SLL',
    "providerRef" TEXT,
    "orangeMoneyRef" TEXT,
    "stripePaymentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "restaurantId" TEXT,
    "riderId" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escrowBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SLL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accountDetails" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromoType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrder" DOUBLE PRECISION,
    "maxDiscount" DOUBLE PRECISION,
    "restaurantId" TEXT,
    "cityId" TEXT,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "riderId" TEXT,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "foodRating" INTEGER,
    "comment" TEXT,
    "photos" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "cityId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "responses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantAnalytics" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPrepTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendationCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecommendationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_cityId_idx" ON "User"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "OtpCode_phone_email_idx" ON "OtpCode"("phone", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_ownerId_key" ON "Restaurant"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE INDEX "Restaurant_cityId_status_idx" ON "Restaurant"("cityId", "status");

-- CreateIndex
CREATE INDEX "Restaurant_isFeatured_idx" ON "Restaurant"("isFeatured");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_idx" ON "MenuItem"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_userId_key" ON "Rider"("userId");

-- CreateIndex
CREATE INDEX "Rider_status_isOnline_idx" ON "Rider"("status", "isOnline");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_restaurantId_idx" ON "Order"("restaurantId");

-- CreateIndex
CREATE INDEX "Order_riderId_idx" ON "Order"("riderId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_restaurantId_key" ON "Wallet"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_riderId_key" ON "Wallet"("riderId");

-- CreateIndex
CREATE INDEX "Transaction_walletId_idx" ON "Transaction"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_restaurantId_key" ON "Favorite"("userId", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantAnalytics_restaurantId_date_key" ON "RestaurantAnalytics"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AiRecommendationCache_userId_type_idx" ON "AiRecommendationCache"("userId", "type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuVariant" ADD CONSTRAINT "MenuVariant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuAddon" ADD CONSTRAINT "MenuAddon_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimeline" ADD CONSTRAINT "OrderTimeline_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantAnalytics" ADD CONSTRAINT "RestaurantAnalytics_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
