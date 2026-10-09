# MediCare — Architecture & Project Audit (Phase 01)

> Living document. Updated as phases complete.

## 1. High-Level Structure

```text
MediCare/
├── backend/          Node.js + Express + Mongoose API (port 5000)
├── frontend/         React + Vite + Tailwind CSS v4 SPA (port 5173)
├── ARCHITECTURE.md   This file
├── prompt.md         45-phase master prompt
└── .gitignore        Root ignore rules (env, node_modules, dist, uploads)
```

Git: 6 commits, branch `main`, remote `github.com/rohan-gupta-14/MediCare.git`, working tree clean.
No monorepo root `package.json` — backend and frontend are independent npm projects.

## 2. Backend (Express)

```text
backend/
├── server.js                    Express app: CORS, JSON parsing, /api/health,
│                                404 handler, global error handler, route
│                                placeholders commented per phase
├── config/db.js                 DONE (Phase 04) — connectDB(): validates MONGO_URI,
│                                10s serverSelection timeout, lifecycle event logs,
│                                returns true/false (never throws)
├── middleware/auth.middleware.js PLACEHOLDER — protect/authorizeRoles stubs (Phase 06/08)
├── utils/apiResponse.js         DONE — successResponse()/errorResponse() helpers
├── controllers/.gitkeep         Empty — controllers from Phase 06 on
├── .env.example                 DONE — PORT, MONGO_URI, JWT, Cloudinary, email,
│                                RAZORPAY, FRONTEND_URL placeholders
├── .gitignore                   DONE — ignores .env, node_modules, uploads
└── package.json                 deps: express, mongoose, jsonwebtoken, bcryptjs,
                                 cors, dotenv, multer (+ nodemon)
```

Verified: `npm run dev` boots and `GET /api/health` returns
`{"success":true,"message":"MediCare API is running",...}`.

Not yet installed (needed in later phases): cloudinary, nodemailer, helmet,
express-rate-limit, express-validator (or manual validation), razorpay.

## 3. Frontend (React + Vite)

```text
frontend/src/
├── main.jsx              BrowserRouter + App (no providers yet)
├── App.jsx               Routes: "/" → Home, "*" → 404. Auth/dashboard routes commented
├── index.css             @import "tailwindcss" (Tailwind v4 via @tailwindcss/vite)
├── components/Navbar.jsx DONE — public navbar, mobile menu, hide/show styles
├── layouts/MainLayout.jsx PLACEHOLDER passthrough (full dashboard layout → Phase 09)
├── pages/Home.jsx        Renders only <Navbar /> — landing page not built yet
├── context/AuthContext.jsx PLACEHOLDER — useAuth() hook scaffold (Phase 07)
├── services/api.js       Axios instance: baseURL from VITE_API_URL (fallback
│                         localhost:5000/api), JWT request interceptor,
│                         401 response interceptor
├── hooks/useLocalStorage.js  DONE
├── utils/formatDate.js        DONE — formatDate, formatDateTime, getAge (en-IN)
├── assets/               60+ images + dummyStyles.js (1,529 lines of ready-made
│                         Tailwind style objects: tables, cards, forms, modals,
│                         toasts, dashboard styles)
└── eslint.config.js
```

Verified: `npm run build` succeeds (267 kB JS / 83 kB CSS), `npm run lint` reports **3 errors** (see §6).

Stack notes:
- **Tailwind CSS v4 is already integrated** → we keep it instead of plain CSS/CSS Modules (compatible substitution allowed by the master prompt).
- lucide-react, axios, react-router-dom already installed. recharts not yet installed (Phase 10).

## 4. Phase Status Map (45 phases)

| Phase | Feature | Status |
|-------|---------|--------|
| 01 | Project audit | ✅ Done (this document) |
| 02 | Architecture & cleanup | ✅ Done — `models/`, `routes/`, `services/`, `styles/` created; Clerk leftover `frontend/.env` untracked+deleted; 3 lint errors fixed (`npm run lint` = 0 errors) |
| 03 | Environment config | ✅ Done — `backend/.env` (dev values + random JWT secret, ignored), `backend/.env.example` complete, `frontend/.env.example` + `frontend/.env` with `VITE_API_URL`; verified: no `.env` tracked, both ignored, backend boots from `.env`, Vite `loadEnv` resolves the var |
| 04 | MongoDB connection | ✅ Done — `connectDB()` wired into `server.js` startup (dev warns + boots, prod exits 1), `/api/health` reports `database` state; verified live: connected to local Compass MongoDB `medicare` DB, failure paths (empty/bad URI) tested |
| 05 | User model | ⬜ |
| 06 | Backend auth (JWT) | ⬜ Middleware stubs exist |
| 07 | Frontend auth | 🟡 ~20% — axios instance + AuthContext scaffold exist; no Login/Register pages, no AuthProvider |
| 08 | Role-based access | ⬜ `authorizeRoles()` stub exists |
| 09 | Dashboard layout | 🟡 ~10% — MainLayout passthrough; public Navbar done |
| 10 | Admin dashboard | ⬜ |
| 11–42 | Models/UI/features | ⬜ Not started |
| 43 | UI polish | ⬜ dummyStyles.js gives a head start |
| 44 | E2E testing | ⬜ No test files exist yet |
| 45 | Deployment | ⬜ No vercel.json / render.yaml yet |

Public landing page (hero, services, doctors sections) is **not built** — only assets exist.

## 5. Security / Config Findings

1. ~~**`frontend/.env` is tracked by git**~~ → **FIXED in Phase 02**: file untracked and deleted (it only contained a dead `VITE_CLERK_PUBLISHABLE_KEY`). No `.env` files are tracked anymore.
2. ~~**Clerk is a dead leftover**~~ → **REMOVED in Phase 02**: `.env` gone, no Clerk package in `package.json`, no source file imports Clerk. Auth is JWT per Phases 06–08.
3. ~~Backend has **no `.env`**~~ → **FIXED in Phase 03**: `backend/.env` created (git-ignored) with dev PORT/NODE_ENV/JWT values; **`MONGO_URI` set in Phase 04** — local MongoDB Compass (`localhost:27017/medicare`); switch to Atlas string later for deployment.
4. `services/api.js` redirects to `/login` on 401, but `/login` route doesn't exist yet → will 404 until Phase 07.

## 6. Known Issues

**Fixed in Phase 02:**
- ~~unused `MainLayout` import in `App.jsx`~~
- ~~unused `useRef` import in `Navbar.jsx`~~
- ~~`react-refresh/only-export-components` in `AuthContext.jsx`~~ → `useAuth` split into `src/hooks/useAuth.js`

**Open:**
- Navbar links (`/doctors`, `/services`, `/appointments`, `/contact`) and Login button (`/login`) all hit the 404 route — fixed as Phases 07/09/landing page land
- Stack decisions confirmed: **Tailwind** (not CSS Modules), **bcryptjs** (not bcrypt)
