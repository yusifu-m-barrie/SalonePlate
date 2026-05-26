# SalonePlate Deployment Guide

## Architecture Overview

```
                    ┌─────────────┐
                    │   CDN / LB  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Next.js   │  │  NestJS    │  │  Socket.IO │
    │  (Vercel/  │  │  API       │  │  (same     │
    │   VPS)     │  │  (Docker)  │  │   host)    │
    └────────────┘  └─────┬──────┘  └────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       ┌────────────┐          ┌────────────┐
       │ PostgreSQL │          │   Redis    │
       │ (managed)  │          │ (managed)  │
       └────────────┘          └────────────┘
```

---

## Docker Production Deploy

### Full stack with Docker Compose

```bash
# Set production secrets
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Build and start
docker compose up -d --build
```

### Run migrations on deploy

```bash
docker exec saloneplate-api npx prisma migrate deploy
docker exec saloneplate-api npx prisma db seed  # first deploy only
```

---

## API Deployment (Railway / Render / AWS ECS)

1. Build Docker image from repo root: `docker build -f Dockerfile.api .`
2. Set environment variables from `services/api/.env.example`
3. Attach managed PostgreSQL and Redis
4. Run `prisma migrate deploy` on release
5. Expose port 4000 with health check on `/api/v1/health`

> **Step-by-step:** See [HOSTING.md](./HOSTING.md) for Render + Vercel + EAS instructions.

### Required env vars

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGIN=https://admin.saloneplate.sl,https://app.saloneplate.sl
ORANGE_MONEY_*=
CLOUDINARY_*=
```

---

## Web Dashboard (Vercel)

```bash
cd apps/web
vercel --prod
```

Environment variables:
```
NEXT_PUBLIC_API_URL=https://api.saloneplate.sl/api/v1
NEXTAUTH_URL=https://admin.saloneplate.sl
NEXTAUTH_SECRET=
```

---

## Mobile App (Expo EAS)

```bash
cd apps/mobile
npm install -g eas-cli
eas build --platform all
eas submit
```

Configure `eas.json` and set:
```
EXPO_PUBLIC_API_URL=https://api.saloneplate.sl
EXPO_PUBLIC_SOCKET_URL=https://api.saloneplate.sl
```

---

## Orange Money Sierra Leone Integration

1. Register merchant account with Orange Money SL
2. Obtain `ORANGE_MONEY_CLIENT_ID`, `ORANGE_MONEY_CLIENT_SECRET`, `ORANGE_MONEY_MERCHANT_KEY`
3. Set callback URLs to production domain
4. Test sandbox → production switch
5. Webhook: `POST /api/v1/payments/orange-money/callback`

---

## Database Backups

- Enable automated daily backups on managed PostgreSQL
- Point-in-time recovery recommended for production
- Test restore procedure monthly

---

## Scaling Checklist

| Stage | Action |
|-------|--------|
| Makeni launch | Single API instance, managed DB |
| Freetown | Activate `freetown` city, add delivery zones |
| Multi-country | New `Country` records, currency config |
| High traffic | Redis cluster, API horizontal scaling, CDN for images |

---

## Security Hardening

- Rotate JWT secrets quarterly
- Enable API rate limiting (configured in NestJS Throttler)
- WAF on public endpoints
- Audit logs table for admin actions
- Encrypt sensitive env vars in secret manager
- Never commit `.env` files

---

## Monitoring

Recommended stack:
- **Sentry** — Error tracking (API + Mobile + Web)
- **Uptime Robot** — API health checks
- **Grafana + Prometheus** — Metrics at scale
- **Logtail / CloudWatch** — Centralized logs

---

## CI/CD

GitHub Actions workflow runs on push:
- Install dependencies
- Lint and typecheck
- Build API and Web
- Prisma validate

See `.github/workflows/ci.yml`
