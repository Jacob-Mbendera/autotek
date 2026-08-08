# AutoTek — Render deployment guide

This document describes how to deploy AutoTek to [Render](https://render.com) as a **single web service**: the Node/Express API serves the **Vite** production build from `frontend/dist`, matching the same pattern used for HealthConnect.

## Architecture

| Piece | Role |
|--------|------|
| **Build** | Repo root runs `npm run render-build`: installs frontend deps, runs `vite build`, installs backend deps, runs `tsc`. |
| **Runtime** | `cd backend && npm start` runs `node dist/server.js`. |
| **Static UI** | When `NODE_ENV=production`, Express serves `frontend/dist` and falls back to `index.html` for client-side routes (SPA). |
| **API** | All routes under `/api/*`. |
| **Health check** | `GET /api/health` |

## Prerequisites

- Git repository connected to Render (GitHub/GitLab/Bitbucket).
- **MongoDB Atlas** (or other) connection string.
- **Cloudinary**, **PayChangu**, and **SMTP** credentials as required by your environment (see `docs/backend-setup/ENV_TEMPLATE.md` and `backend/.env.example` if present).

Do **not** commit real secrets. Configure them only in the Render dashboard or via synced secret stores.

## Option A — Blueprint (`render.yaml`)

1. In the Render dashboard, create a **Blueprint** and point it at this repo (include `render.yaml` at the repository root).
2. Adjust the service **name**, **region**, or **plan** in `render.yaml` if needed, then commit and push.
3. After the blueprint is applied, open the web service **Environment** tab and set every variable marked `sync: false` (and override generated values if you prefer your own `JWT_SECRET`).
4. Set **`FRONTEND_URL`** and **`VITE_BASE_URL`** to your service’s public HTTPS URL (see [Important URLs](#important-urls)).
5. Trigger a **manual deploy** so the frontend bundle is rebuilt with the correct `VITE_BASE_URL`.

## Option B — Manual web service

Create a **Web Service** with:

| Setting | Value |
|---------|--------|
| **Root directory** | Repository root (leave empty if the repo is only AutoTek). |
| **Build command** | `npm run render-build` |
| **Start command** | `cd backend && npm start` |
| **Health check path** | `/api/health` |

Add the environment variables listed below.

## Environment variables

### Required for a working app

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Must be `production` for static UI + SPA fallback. |
| `PORT` | Render sets this; `render.yaml` uses `10000` as a default. Prefer the value Render injects. |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_SECRET` | Signing key for JWTs (use a long random string). |
| `FRONTEND_URL` | Public site URL used by the backend (emails, PayChangu return/cancel URLs, etc.). **Must match** the URL users open in the browser. |
| `VITE_BASE_URL` | Baked into the client at **build time**. Set to the same public URL as `FRONTEND_URL`, then **redeploy** after changing. |
| `VITE_API_URL` | Use `/api` so the browser talks to the API on the **same origin** as the SPA. |

### Payments (PayChangu)

| Variable | Purpose |
|----------|---------|
| `PAYCHANGU_API_KEY` | Public key from PayChangu. |
| `PAYCHANGU_API_SECRET` | Secret key. |
| `PAYCHANGU_BASE_URL` | e.g. `https://api.paychangu.com` (see PayChangu docs for sandbox vs production). |
| `PAYCHANGU_WEBHOOK_SECRET` | Used to verify webhooks; must match PayChangu configuration. |

Configure the PayChangu dashboard webhook URL to your deployed API, e.g. `https://<your-service>.onrender.com/api/payments/...` (use the exact path your backend exposes; see payment routes in the codebase).

### Media (Cloudinary)

| Variable | Purpose |
|----------|---------|
| `CLOUDINARY_CLOUD_NAME` | Cloud name. |
| `CLOUDINARY_API_KEY` | API key. |
| `CLOUDINARY_API_SECRET` | API secret. |

### Email (SMTP)

| Variable | Purpose |
|----------|---------|
| `EMAIL_HOST` | SMTP host. |
| `EMAIL_PORT` | Usually `587`. |
| `EMAIL_USER` | SMTP username. |
| `EMAIL_PASS` | SMTP password or app password. |
| `EMAIL_FROM` | From header, e.g. `AutoTek <noreply@yourdomain.com>`. |

### Optional

| Variable | Purpose |
|----------|---------|
| `AIRTEL_API_URL` | Defaults are set in `render.yaml`; override for production Airtel APIs if needed. |
| `AIRTEL_CLIENT_ID` / `AIRTEL_CLIENT_SECRET` | If you enable Airtel Money integrations. |
| `GOOGLE_MAPS_API_KEY` | If you use Google geocoding; otherwise the app may fall back to other providers per code. |

## Important URLs

- **`FRONTEND_URL`** (backend): Example `https://autotek.onrender.com` — no trailing slash issues should be avoided; use the canonical URL you use in PayChangu and emails.
- **`VITE_BASE_URL`** (frontend build): Should be the **same** public origin as `FRONTEND_URL`. Vite embeds this at build time for payment redirects and similar flows.
- **`VITE_API_URL`**: For this deployment model, use **`/api`** so API calls stay same-origin.

**First-time deploy:** You may not know the final Render URL until the service exists. After the first successful deploy:

1. Copy the service URL from Render.
2. Set `FRONTEND_URL` and `VITE_BASE_URL` to that URL.
3. Run **Clear build cache & deploy** (or equivalent) so `vite build` runs again with the new `VITE_BASE_URL`.

## Build script details

Root `package.json` defines:

```bash
npm run render-build
```

Which effectively:

1. Installs frontend dependencies and runs **`npx vite build`** (production bundle to `frontend/dist`).
2. Installs backend dependencies and runs **`npm run build`** (`tsc` → `backend/dist`).

The frontend `package.json` `build` script normally runs `tsc -b && vite build`. The Render script uses **`vite build` only** so deploys are not blocked by existing TypeScript project errors. Long term, fix `tsc` in CI and align the Render script with `npm run build` in `frontend` if you want strict typecheck on every deploy.

## Verification checklist

After deploy:

- [ ] `GET https://<your-host>/api/health` returns JSON with a running status.
- [ ] Opening `https://<your-host>/` loads the React app (not 404).
- [ ] Direct navigation to a deep link (e.g. `/products`) still loads the SPA (server fallback to `index.html`).
- [ ] Login and an authenticated API call succeed (cookies/JWT as designed).
- [ ] PayChangu return URL lands on your `FRONTEND_URL` and payment verification hits the API.

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| **502 / service unavailable** | Build failed or `npm start` crashed. Read Render **Logs**. Confirm `backend/dist/server.js` exists after build. |
| **API works, UI is blank or 404** | `NODE_ENV` must be `production`. Confirm `frontend/dist` exists after build and paths in `server.ts` match repo layout. |
| **CORS errors** | With `VITE_API_URL=/api`, the browser should not cross origins. If you pointed the client at another API URL by mistake, fix env and rebuild. |
| **PayChangu redirect wrong host** | `FRONTEND_URL` / `VITE_BASE_URL` wrong or client not rebuilt after changing them. |
| **Webhooks not verified** | `PAYCHANGU_WEBHOOK_SECRET` and PayChangu dashboard URL must match production. |

## Git workflow (project convention)

Active development uses the **`dev`** branch; production merges follow your team process. See `.cursorrules` for the full branching notes.

## Related files

| File | Role |
|------|------|
| `render.yaml` | Blueprint definition for Render. |
| `package.json` (root) | `render-build` script. |
| `backend/src/server.ts` | Production static files + SPA fallback. |
| `frontend/.env.example` | Local dev examples for `VITE_*` variables. |
