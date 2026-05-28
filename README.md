# SalonePlate

**Premium multi-restaurant food delivery marketplace for Sierra Leone**

Launch city: **Makeni** · Scalable to Freetown and across Africa

Inspired by Uber Eats, Glovo, DoorDash, and Bolt Food — optimized for African markets, mobile money, and low-bandwidth environments.

---

## Brand

| Element | Value |
|---------|-------|
| Dark Blue | `#071A2F` |
| Gold Accent | `#D4AF37` |
| White | `#FFFFFF` |
| Soft Gray | `#9CA3AF` |

---

## Monorepo Structure

```
saloneplate/
├── apps/
│   ├── mobile/          # React Native + Expo (Customer + Rider)
│   └── web/             # Next.js Admin & Restaurant Dashboard
├── packages/
│   └── shared-types/    # Shared TypeScript enums & constants
├── services/
│   └── api/             # NestJS + Prisma + PostgreSQL + Redis + Socket.IO
├── docker-compose.yml
└── docs/
    └── DEPLOYMENT.md
```

---

## Tech Stack

### Mobile (`apps/mobile`)
- React Native, Expo 52, TypeScript, Expo Router
- Zustand, TanStack Query, Axios, React Hook Form + Zod
- React Native Maps, Socket.IO, Expo Notifications, MMKV/SecureStore
- Reanimated, Gesture Handler, Premium dark UI

### Web Dashboard (`apps/web`)
- Next.js 15 App Router, TypeScript, TailwindCSS
- ShadCN-style components, Framer Motion, Recharts
- TanStack Table/Query, Zustand, NextAuth

### API (`services/api`)
- NestJS, PostgreSQL, Prisma ORM, Redis
- JWT + Refresh tokens, RBAC, Rate limiting
- Socket.IO real-time, Cloudinary uploads
- Orange Money SL architecture, Stripe-ready, Escrow wallets

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL & Redis)
- npm 10+

### 1. Install dependencies

```bash
npm install
```

### 2. Database (choose one)

**Without Docker (recommended if Docker Desktop fails):**  
See **[docs/SETUP-WITHOUT-DOCKER.md](docs/SETUP-WITHOUT-DOCKER.md)** — free Supabase/Neon Postgres + `REDIS_DISABLED=true`.

**With Docker:**

```bash
docker compose up -d postgres redis
```

### 3. Configure API

```bash
cp services/api/.env.example services/api/.env
# Edit DATABASE_URL if needed
```

### 4. Database setup

```bash
cd services/api
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start API

From the **project root** (`mobile app`):

```bash
npm run dev:api
```

Or from `services/api`:

```bash
cd services/api
npm run dev
```

API: http://localhost:4000 — Swagger: http://localhost:4000/api/docs

### 6. Start Web Dashboard

```bash
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
# http://localhost:3000
```

### 7. Start Mobile App

```bash
cd apps/mobile
# Set EXPO_PUBLIC_API_URL to your machine IP for physical device
npm run start
```

---


---

## User Roles

- **Customer** — Browse, order, track, review
- **Restaurant Owner** — Menu, orders, analytics (dashboard)
- **Rider** — Accept deliveries, earnings, withdrawals
- **City Manager** — Regional operations (future)
- **Super Admin** — Full platform control

---

## API Highlights

| Module | Endpoints |
|--------|-----------|
| Auth | Register, login, phone OTP, refresh, forgot password |
| Restaurants | Discover, menu, favorites, trending |
| Orders | Create, track, status updates |
| Payments | Orange Money, COD, escrow, transactions |
| Riders | Online toggle, location, earnings, withdraw |
| Admin | Dashboard stats, approve/suspend |
| AI | Recommendations, ETA prediction (architecture) |
| Realtime | Socket.IO order & rider tracking |

---

## Payments Architecture

- **Orange Money Sierra Leone** — Checkout flow + callback handler
- **Cash on Delivery** — Default for Makeni launch
- **Airtel Money** — Enum ready
- **Stripe** — Schema + service stubs ready
- **Wallets** — Customer, restaurant, rider balances with escrow

---

## Multi-City Architecture

- `City` model with slug (`makeni`, `freetown`)
- Per-city tax rates, delivery base fees
- `DeliveryZone` polygons for geo-pricing
- Featured content and banners per city

---

## Production Checklist

- [ ] Change all JWT secrets and NextAuth secret
- [ ] Configure Orange Money production credentials
- [ ] Set up Cloudinary for image uploads
- [ ] Configure SMS gateway for OTP (Africa's Talking / Twilio)
- [ ] Enable HTTPS and production CORS origins
- [ ] Set up CI/CD (see `.github/workflows/ci.yml`)
- [ ] Configure push notifications (Expo EAS)
- [ ] Add monitoring (Sentry, Datadog)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment guide.

---

## License

Proprietary — SalonePlate © 2026





## Mobile sign up

1. **Create Account** → choose Customer, Rider, or Restaurant.
2. **Email:** enter email → **Send verification code** → enter 6-digit code + password → **Create account**.
   - Without SMTP, codes appear in the API terminal as `[DEV EMAIL OTP]`.
3. **Google:** fill profile fields → **Continue with Google** (requires `GOOGLE_CLIENT_ID` in API `.env` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `apps/mobile/.env`).
4. Rider and restaurant accounts are created as **pending** until approved.

### Admin approvals (web)

Use the **admin account** (not your new restaurant mobile sign-up):

1. Start API: `cd services/api` → `npm run dev`
2. Start web: `npm run dev:web` → http://localhost:3000/login
3. Sign in: `..........................`
2. Open **Restaurants** or **Riders** in the sidebar.
3. Use **Approve** / **Reject** on pending sign-ups (data comes from the database).

### Google sign-in (mobile login)

On the login screen, **Continue with Google** signs in existing accounts only (sign up first if new).

### Restaurant owner — add menu

Restaurant owners manage their own menu (admins only approve restaurants, they do not add food).

**Mobile app** (after signing up / signing in as Restaurant):
- You land on **My Restaurant** at `/owner` → **Menu** tab to add dishes.

**Web** (optional, same account):
1. http://localhost:3000/login with your restaurant email/password.
2. You are sent to `/restaurant` (not the admin dashboard).
3. Open **Menu & Food** in the sidebar.

Required fields: **name**, **price (Le)**, **category** (dropdown). Optional: description, prep time, compare-at price, tags, **thumbnail upload**, **extra photo uploads**, available, popular.

**Categories:** Starters, Soups & Stews, Rice Dishes, Local Specialties, Grilled & BBQ, Fast Food, Seafood, Vegetarian, Sides, Drinks, Desserts, Combos, Breakfast, Kids Menu.

**Images:** Thumbnail shows on the menu list; extra photos appear when customers tap a dish.

Set `API_PUBLIC_URL` in `services/api/.env` to your PC IP (same host as mobile `EXPO_PUBLIC_API_URL` but port 4000, no `/api/v1`) so uploaded images load on phones.

---

