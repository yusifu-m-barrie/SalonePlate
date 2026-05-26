# Host SalonePlate (API + Web + Mobile)

This guide gets **production** running with:

| Piece | Host | Notes |
|-------|------|--------|
| Database | **Supabase** (already) | Keep using pooler `DATABASE_URL` + `DIRECT_URL` |
| API | **Render** or **Railway** | Docker image from `Dockerfile.api` |
| Admin / restaurant web | **Vercel** | `apps/web` |
| Customer / owner / rider app | **Expo EAS** | APK/IPA or app stores |

Replace `YOUR_API_HOST` below with your real API URL (e.g. `saloneplate-api.onrender.com`).

---

## 0. Prerequisites

1. Code on **GitHub** (Render/Vercel connect to Git).
2. **Supabase** project with Prisma URLs (see `services/api/.env.example`).
3. Accounts: [Render](https://render.com), [Vercel](https://vercel.com), [Expo](https://expo.dev) (free tiers are fine to start).

Generate secrets (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Use two different values for `JWT_SECRET` and `JWT_REFRESH_SECRET`, and another for `NEXTAUTH_SECRET`.

---

## 1. Deploy the API

### Option A — Render (recommended)

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → select the repo.
3. Render reads `render.yaml` and creates `saloneplate-api`.
4. Set these **manual** env vars in the service (copy from your local `services/api/.env` where applicable):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Supabase **transaction pooler** (port **6543**, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase **direct** URL (for migrations) |
| `API_PUBLIC_URL` | `https://YOUR_API_HOST` (no trailing slash) |
| `CORS_ORIGIN` | `https://YOUR_WEB_HOST.vercel.app` (add more origins comma-separated) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Long random strings |
| `REDIS_DISABLED` | `true` (until you add Redis) |
| `CLOUDINARY_*` | If you use Cloudinary for images |
| `SMTP_*` | For verification emails in production |

5. After deploy, open: `https://YOUR_API_HOST/api/v1/health` → should return `{"ok":true,...}`.
6. Swagger: `https://YOUR_API_HOST/api/docs`

**Note:** Free Render services sleep after inactivity; first request may take ~30s.

### Option B — Docker on a VPS

```bash
export JWT_SECRET=...
export JWT_REFRESH_SECRET=...
export DATABASE_URL=...
export DIRECT_URL=...
export API_PUBLIC_URL=https://api.yourdomain.com
export CORS_ORIGIN=https://admin.yourdomain.com

docker build -f Dockerfile.api -t saloneplate-api .
docker run -d -p 4000:4000 --env-file services/api/.env saloneplate-api
```

### Option C — Local production stack

Uses Docker Postgres + Redis (not Supabase):

```powershell
$env:JWT_SECRET = "your-production-jwt-secret-min-32-chars"
$env:JWT_REFRESH_SECRET = "your-production-refresh-secret-min-32"
docker compose up -d --build
```

---

## 2. Deploy the web dashboard (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
2. **Root Directory:** `apps/web`
3. Framework should auto-detect **Next.js** (`vercel.json` runs install/build from monorepo root).
4. **Environment variables:**

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_API_HOST/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://YOUR_API_HOST` |
| `NEXTAUTH_URL` | `https://YOUR_WEB_HOST.vercel.app` |
| `NEXTAUTH_SECRET` | Random 32+ char secret |

5. Deploy → open the Vercel URL → sign in as admin or restaurant owner.

6. **Update API CORS:** In Render, set `CORS_ORIGIN` to your Vercel URL (and custom domain later):

```
https://YOUR_WEB_HOST.vercel.app,https://admin.saloneplate.sl
```

Redeploy API if you change CORS.

---

## 3. Build & distribute the mobile app (EAS)

### One-time setup

```powershell
npm install -g eas-cli
cd apps/mobile
eas login
eas init
```

`eas init` links the project on Expo and adds `extra.eas.projectId` to `app.config.js`.

### Point the app at production API

Edit `apps/mobile/eas.json` — replace `REPLACE_WITH_YOUR_API_HOST` in `preview` and `production` profiles with your real API host (no `https://` duplication).

Or set secrets in Expo dashboard: **Project → Environment variables**.

### Build

```powershell
cd apps/mobile

# Android APK for testers (no Play Store yet)
eas build --platform android --profile preview

# iOS (needs Apple Developer account for device builds)
eas build --platform ios --profile preview

# Store-ready builds
eas build --platform all --profile production
```

### Install on phones

- **Android:** Download the APK from the Expo build page, or use `eas build:run`.
- **iOS:** Internal distribution / TestFlight via `eas submit`.

### App Store / Play Store (later)

```powershell
eas submit --platform android
eas submit --platform ios
```

You need Google Play Console and Apple Developer accounts.

---

## 4. Production checklist

- [ ] `https://YOUR_API_HOST/api/v1/health` returns OK
- [ ] Web login works against production API
- [ ] Mobile app loads restaurants (not “network error”)
- [ ] Image URLs load (`API_PUBLIC_URL` must be HTTPS in production)
- [ ] Email verification works (`SMTP_*` set) or you accept dev-style codes only in staging
- [ ] `CORS_ORIGIN` includes every web origin you use
- [ ] Secrets are **not** committed to Git

---

## 5. Custom domains (optional)

| Service | Domain example | Where |
|---------|----------------|--------|
| API | `api.saloneplate.sl` | Render → Custom Domain |
| Web | `admin.saloneplate.sl` | Vercel → Domains |

After adding domains, update:

- `API_PUBLIC_URL`, `CORS_ORIGIN`, `NEXTAUTH_URL`, `NEXT_PUBLIC_*`, and `eas.json` env URLs.

---

## 6. Google Sign-In & payments (when ready)

- Google: `docs/GOOGLE_SIGNIN_SETUP.md` — add production redirect URIs in Google Cloud Console.
- Orange Money: set `ORANGE_MONEY_*` on the API and register callback URLs with Orange.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Web “Network Error” | Check `NEXT_PUBLIC_API_URL`, API is awake, CORS includes Vercel URL |
| Mobile can’t reach API | Use `https://` in `EXPO_PUBLIC_API_URL`, not LAN IP |
| Images broken | Set `API_PUBLIC_URL` to public API URL; prefer Cloudinary |
| Prisma migrate fails on deploy | Set `DIRECT_URL` to Supabase direct connection |
| Render build fails | Build must use repo root + `Dockerfile.api` (see `render.yaml`) |

See also: `docs/DEPLOYMENT.md` (architecture and scaling).
