# Deployment Guide — No Bargaining POS

How to ship the backend (FastAPI + MongoDB) and the React frontend to production.

---

## 1. Prerequisites

- A MongoDB database (use **MongoDB Atlas** free tier — same cluster you already have).
- A GitHub repo with this project.
- Accounts: [Railway](https://railway.app) **or** [Render](https://render.com) (backend) + [Vercel](https://vercel.com) (frontend).

---

## 2. Backend → Railway (recommended)

1. New Project → **Deploy from GitHub repo**.
2. Select the repo, set **Root Directory = `backend`**.
3. Start command:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
   (Railway injects `$PORT`. If using Render, set it as `uvicorn main:app --host 0.0.0.0 --port 10000` and let Render map.)
4. Add environment variables (Settings → Variables):
   ```
   MONGO_URL=mongodb+srv://<user>:<password>@<cluster>/?appName=Cluster0
   DB_NAME=nobargaining_pos
   CORS_ORIGINS=https://<your-vercel-domain>.vercel.app
   JWT_SECRET=<generate: python -c "import secrets;print(secrets.token_hex(32))">
   ACCESS_TOKEN_EXPIRE_HOURS=12
   ADMIN_EMAIL=admin@nobargaining.com
   ADMIN_PASSWORD=<STRONG_PASSWORD>
   ```
5. Deploy. Copy the generated backend URL, e.g. `https://nobargaining-backend.up.railway.app`.

> **Render alternative:** New → Web Service → Root Dir `backend`, Build `pip install -r requirements.txt`, Start `uvicorn main:app --host 0.0.0.0 --port 10000`. Same env vars.

---

## 3. Backend → Docker (optional / self-host)

A `Dockerfile` and `docker-compose.yml` already exist in `backend/`.

```bash
cd backend
docker compose up --build      # backend + mongo together
```

For a single container on any host (Render/Railway Docker, Fly.io, EC2):
```bash
docker build -t nobargaining-backend .
docker run -p 8001:8001 --env-file .env nobargaining-backend
```

---

## 4. Frontend → Vercel

1. Import the GitHub repo in Vercel.
2. **Root Directory = `frontend`**, Framework = **Create React App** (Vercel auto-detects).
3. Build command: `npm run build` · Output: `build`.
4. **Environment variable** (Project → Settings → Environment Variables):
   ```
   REACT_APP_BACKEND_URL=https://<your-backend-domain>
   ```
   Must point to the deployed backend URL from step 2 (no trailing slash).
5. Deploy. Vercel gives you `https://<project>.vercel.app`.

> Rebuild needed if you change `REACT_APP_BACKEND_URL` — Vercel reads env at build time.

---

## 5. Connect them

- Frontend calls `${REACT_APP_BACKEND_URL}/api/...`.
- Backend must allow the frontend origin in `CORS_ORIGINS` (comma-separated list).
- After both deploy, open the Vercel URL, login with the admin credentials.

---

## 6. Production Hardening Checklist

Do ALL of these before going live:

- [ ] **Change `JWT_SECRET`** to a fresh 64-char random hex (`secrets.token_hex(32)`). Never reuse dev secret.
- [ ] **Restrict `CORS_ORIGINS`** to your real frontend domain(s), e.g.
      `https://app.example.com,https://admin.example.com` — do NOT leave it as `*`.
- [ ] **Change `ADMIN_PASSWORD`** to a strong unique password (the seed only runs once; to reset, delete the admin doc in Mongo and restart).
- [ ] **Use a real `MONGO_URL`** with a dedicated DB user + strong password; enable Atlas IP access / VPC.
- [ ] **Set `ACCESS_TOKEN_EXPIRE_HOURS`** appropriately (12 is fine; lower for kiosk/shared terminals).
- [ ] **HTTPS everywhere** — Vercel/Railway/Render provide it by default; ensure no plain-HTTP calls.
- [ ] **Secrets management** — use the platform's secret store, never commit `.env` (already gitignored; double-check).
- [ ] **Rate limiting / WAF** — add a reverse proxy (e.g. Cloudflare) for public endpoints.
- [ ] **Backups** — enable MongoDB Atlas continuous backups / snapshots.
- [ ] **Monitoring** — watch backend logs (Railway/Render) and frontend Vercel Analytics; set alerts on 5xx.
- [ ] **Frontend build** — confirm `REACT_APP_BACKEND_URL` is the production backend (not localhost).
- [ ] **Smoke test post-deploy**: login → create a product → create an order → check `/api/docs` is reachable only as needed.

---

## 7. Quick verify after deploy

```bash
# backend health
curl https://<backend>/api
# swagger
open https://<backend>/api/docs
# frontend
open https://<vercel>.vercel.app
```

If login fails with CORS errors, the `CORS_ORIGINS` value does not match the
frontend domain exactly — fix and redeploy backend.
