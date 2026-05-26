# Google (Gmail) sign-in setup — SalonePlate customers

Customer sign-in uses **Google OAuth**. You need client IDs from Google Cloud Console in **two** places:

| File | Variable |
|------|----------|
| `apps/mobile/.env` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (+ iOS/Android) |
| `services/api/.env` | `GOOGLE_CLIENT_ID` (same value as **Web** client ID) |

---

## Step 1 — Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. **SalonePlate**) or select an existing one.
3. Go to **APIs & Services → OAuth consent screen**.
4. Choose **External** (for real Gmail users later) or **Internal** (Workspace only).
5. Fill app name: **SalonePlate**, support email, developer email.
6. **Scopes:** add `email`, `profile`, `openid` (often added by default).
7. **Test users** (while app is in “Testing”): add Gmail addresses you will test with (e.g. your own Gmail).
8. Save.

---

## Step 2 — OAuth client IDs (Credentials)

Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.

### A) Web client (required)

- Application type: **Web application**
- Name: `SalonePlate Expo Web`

**Authorized redirect URIs** — add **both** (Expo uses one of these):

```
https://auth.expo.io/@YOUR_EXPO_USERNAME/saloneplate
https://auth.expo.dev/@YOUR_EXPO_USERNAME/saloneplate
```

Replace `YOUR_EXPO_USERNAME`:

- Run: `cd apps/mobile && npx expo login` then `npx expo whoami`
- If not logged in, Expo Go may use `@anonymous` — also add:
  ```
  https://auth.expo.io/@anonymous/saloneplate
  ```

Copy the **Client ID** (ends with `.apps.googleusercontent.com`).

### B) iOS client (required on iPhone / Expo Go)

- Application type: **iOS**
- Name: `SalonePlate iOS`
- Bundle ID: `sl.saloneplate.app` (must match `app.json`)

Copy the **iOS Client ID**.

### C) Android client (required on Android)

- Application type: **Android**
- Name: `SalonePlate Android`
- Package name: `sl.saloneplate.app`
- SHA-1: from your debug keystore (see below)

Copy the **Android Client ID**.

#### Android SHA-1 (debug / Expo Go)

```powershell
cd $env:USERPROFILE\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** line into the Android OAuth client.

---

## Step 3 — Add IDs to your project

### `apps/mobile/.env`

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-yyyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-zzzz.apps.googleusercontent.com
```

**Quick test:** you may set iOS and Android to the **same Web client ID** on some setups, but Google often requires separate iOS/Android clients — create all three if sign-in fails.

### `services/api/.env`

```env
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

Use the **Web** client ID here (must match `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).

---

## Step 4 — Restart everything

```powershell
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Mobile (clear cache)
cd apps/mobile
npx expo start -c
```

---

## Step 5 — Test on the phone

1. Open the app → **Welcome** or **Sign in**.
2. Tap **Continue with Google**.
3. Pick your Gmail account (must be a **test user** if consent screen is still in Testing).
4. You should land in the app as a **customer**.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| No Google button | Add env vars above and restart Expo with `-c`. |
| `redirect_uri_mismatch` | Add exact redirect URI from Expo to **Web** client (Step 2A). Run `npm run google:redirect` in `apps/mobile`. |
| `Google sign-in is not configured` on API | Set `GOOGLE_CLIENT_ID` in `services/api/.env` and restart API. |
| `Access blocked` / consent | Add your Gmail under OAuth consent screen → **Test users**. |
| Restaurant email tries Google | Google is **customers only** — owners use email/password. |

---

## Using sierraleoneplate@gmail.com

You can use the same Google Cloud project as your SMTP Gmail. OAuth client IDs are **not** the same as the SMTP app password — you still create OAuth credentials in the console as above.
