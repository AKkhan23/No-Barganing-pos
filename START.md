# No Bargaining POS — Quick Start

## Client demo (zero terminal knowledge needed)
1. Double-click **`backend/start.bat`**  → backend starts (port 8001)
2. Double-click **`frontend/start.bat`** → frontend installs + starts (port 3000)
3. Open **http://localhost:3000** → login:
   - Admin: `admin@nobargaining.com` / `admin123`

That's it. Both windows stay open while the app runs.

## Manual (terminal) — short version
```powershell
# Terminal 1 — Backend
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — Frontend
cd frontend
npm install --legacy-peer-deps   # first time only
npm start
```

## Notes
- First run auto-installs dependencies. Later runs are instant.
- Backend URL for the app is set in `frontend/.env` (`REACT_APP_BACKEND_URL`).
- For production deployment see `DEPLOYMENT_GUIDE.md`.
