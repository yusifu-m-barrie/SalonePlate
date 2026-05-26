# Setup Without Docker

Use **free cloud PostgreSQL** — no Docker Desktop required.

---

## Option A: Supabase (recommended, ~5 minutes)

### 1. Create a database

1. Go to [https://supabase.com](https://supabase.com) and sign up (free).
2. **New project** → name it `saloneplate` → choose a region close to you.
3. Set a **database password** and save it somewhere safe.
4. Wait until the project is ready.

### 2. Get connection strings (important on Windows)

Direct host `db.xxx.supabase.co:5432` is often **IPv6-only** and fails with Prisma `P1001` on many networks.

1. In Supabase, open your project → click **Connect** (top).
2. Choose **ORM** → **Prisma**.
3. Copy **both** URLs (Session pooler + Direct).
4. URL-encode the password: `@` → `%40`, `#` → `%23`.

### 3. Update `services/api/.env`

```env
# Pooler (Session mode, port 5432) — use for the API
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:YOUR_PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true&connect_timeout=30

# Direct — for Prisma migrations (optional; can match pooler if direct fails)
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require&connect_timeout=30

REDIS_DISABLED=true
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
JWT_SECRET=saloneplate-dev-jwt-secret-min-32-characters
JWT_REFRESH_SECRET=saloneplate-dev-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
```

> `REDIS_DISABLED=true` skips Redis — fine for development.

### 4. Run migrations + seed

```powershell
cd "c:\Users\usifu\Videos\mobile app\services\api"
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start apps

```powershell
cd "c:\Users\usifu\Videos\mobile app"
npm run dev:api
```

New terminal:

```powershell
npm run dev:web
```

New terminal:

```powershell
npm run dev:mobile
```

---

## Option B: Neon (alternative cloud Postgres)

1. [https://neon.tech](https://neon.tech) → create project.
2. Copy connection string from dashboard.
3. Paste into `DATABASE_URL` in `services/api/.env`.
4. Set `REDIS_DISABLED=true`.
5. Run `npx prisma migrate dev` and `npx prisma db seed` as above.

---

## Option C: Install PostgreSQL on Windows (local, no cloud)

1. Download installer: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Install PostgreSQL 16, remember the password you set for user `postgres`.
3. Open **pgAdmin** or `psql` and run:

   ```sql
   CREATE USER saloneplate WITH PASSWORD 'saloneplate_secret';
   CREATE DATABASE saloneplate OWNER saloneplate;
   ```

4. In `services/api/.env`:

   ```env
   DATABASE_URL=postgresql://saloneplate:saloneplate_secret@localhost:5432/saloneplate
   REDIS_DISABLED=true
   ```

5. Run migrate + seed as in step 4 above.

---

## Web & mobile env (unchanged)

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=saloneplate-nextauth-secret-min-32-chars
```

**`apps/mobile/.env`** — emulator:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000
```

**Real phone** — use your PC IP from `ipconfig`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.XXX:4000
```

---

## Demo logins

| Role | Email / Phone | Password |
|------|----------------|----------|
| Admin | admin@saloneplate.sl | Password123! |
| Customer | customer@demo.sl | Password123! |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Can't reach database server` | Wrong `DATABASE_URL` or Supabase project paused |
| Supabase SSL error | Add `?sslmode=require` to end of URL |
| Prisma migrate fails on Supabase pooler | Use **direct** connection (port 5432) for migrations, pooler (6543) for runtime |
| API starts but web login fails | Ensure API is on port 4000 and `NEXT_PUBLIC_API_URL` ends with `/api/v1` |
