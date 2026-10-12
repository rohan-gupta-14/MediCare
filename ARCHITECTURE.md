# MediCare — Architecture & Project Audit (Phase 01)

> Living document. Updated as phases complete.

## 📍 Resume Point (end of session 2026-10-12)

- **Completed:** Phases 01–10 (audit, cleanup, env config, MongoDB connection, User model, JWT auth, frontend auth, RBAC, dashboard layout, admin dashboard).
- **Phase 04 verified live:** backend connects to local MongoDB Compass DB `medicare`
  (`backend/.env` → `MONGO_URI=mongodb://localhost:27017/medicare?...`); health check
  `/api/health` returns `"database":"connected"`; failure paths tested too.
- **Phase 05 verified live:** `backend/models/User.model.js` — schema validation (name/email/
  password/role/phone), bcryptjs (12 rounds) hashing on save **and** findOneAndUpdate,
  `matchPassword()`, `toJSON()` strips password, password `select: false`, unique lowercased
  email (`email_1` index confirmed in DB), roles enum + default `patient`, timestamps.
  Verified with a 22-assertion script against the local DB (temp script removed after run).
- **Phase 06 verified live:** `routes/auth.routes.js` + `controllers/auth.controller.js` +
  `middleware/auth.middleware.js` (protect + authorizeRoles); wired into `server.js` at `/api/auth`.
  23-assertion HTTP suite against local DB: register (201, token, no password, default role
  patient), duplicate email 409, validation 400s, login 200/401 (same message for wrong pw vs
  unknown email), inactive login 403, /me 200/401 (missing, garbage, expired tokens),
  authorizeRoles unit checks. Temp script removed after run.
- **Phase 07 verified live:** AuthProvider (`context/AuthContext.jsx`) with login/register/
  logout + session restore via GET /auth/me; `components/ProtectedRoute.jsx` guard (loading →
  /login redirect w/ `state.from`); pages `Login`, `Register`, placeholder `Dashboard`;
  Navbar shows name + Logout when authenticated; `api.js` 401 interceptor fixed to not redirect
  on failed login/register attempts. Verified: `npm run lint` 0 errors, `npm run build` ok
  (329 kB JS), headless-Chrome smoke: /login, /register render forms; /dashboard without session
  → /dashboard with valid token → "Welcome, …" + Logout + role; stale token → back to Login.
- **Phase 08 verified live:** `backend/config/permissions.js` (single-source RBAC matrix:
  15 resources × read/write, 6 roles, admin `*`; `can()` + `effectivePermissions()`),
  `requirePermission(resource, action)` middleware, `GET /api/auth/permissions` endpoint.
  32-assertion suite: matrix conformance for all 6 roles (allow + deny lists vs spec),
  middleware behavior (next/403/401), live HTTP permissions per role, frontend-mirror sync check.
  Frontend: `utils/permissions.js` (UI mirror + `accessibleModules` + `roleHome`),
  `RequireRole` route guard → `/unauthorized` (new page), Dashboard shows role access chips,
  Login/Register navigate via `roleHome()`. Lint 0/0, build ok (332 kB), headless-Chrome:
  /unauthorized renders "Access denied" + role; doctor dashboard shows exactly
  Appointments/Patients/Medical Records/Prescriptions chips. Row-level "own data" scoping
  is deferred to resource controllers (Phases 11+).
- **Phase 09 verified live (2026-10-12):** full dashboard shell. `layouts/MainLayout.jsx`
  (sidebar + sticky header + `lg:pl-64` page container + footer, drawer state derived from
  pathname so no setState-in-effect), `components/Sidebar.jsx` (role-aware sections from
  `utils/navigation.js` → `visibleNavSections(role)`; unbuilt routes render dimmed "Soon"
  items instead of dead links; mobile off-canvas drawer with overlay/Escape/nav-click close),
  `components/Header.jsx` (hamburger + route-derived title), `components/UserMenu.jsx`
  (initials avatar dropdown: Dashboard link, Profile "Soon", logout),
  `components/NotificationBell.jsx` (empty-state shell, real data Phase 38),
  `utils/navigation.js` (NAV_SECTIONS + `titleForPath()`), `permissions.js` gained
  `ROLE_LABELS`/`roleLabel()`. App.jsx nests `/dashboard` inside
  `ProtectedRoute → MainLayout`; Dashboard restyled as a content card.
  **Logout race fixed:** `logout()`-then-`navigate('/')` raced ProtectedRoute's
  `<Navigate to="/login">` (guard could win) → UserMenu + Dashboard now `logout()` then
  `window.location.assign('/')` (same hard-redirect pattern as api.js 401 handler).
  Verified: lint 0/0, build ok (349 kB JS / 85 kB CSS), headless-Chrome CDP smoke with
  hermetic `/auth/me` stub — **admin 25/25, doctor 25/25, patient 23/23**: desktop rail
  x=0/w=256, hamburger hidden on desktop, header title, no dead sidebar links, RBAC
  sections (admin sees all, doctor/patient filtered), user-menu + notification dropdowns,
  outside-click close, content offset 256, mobile drawer off-canvas → opens via hamburger
  → overlay/Escape/nav-click closes, no horizontal overflow at 390 px, logout → `/` +
  session cleared. Temp test scripts removed after run.
- **Session saved (2026-10-12):** Phases 01–09 pushed (Phase 09 = `f3eeb66 create responsive
  dashboard layout`); Phase 10 changes in working tree awaiting the phase commit.
- **Next — start at: PHASE 11 — Patient Model & API**: `backend/models/Patient.model.js`
  (user, patientId, name, email, phone, gender, dateOfBirth, bloodGroup, address,
  emergencyContact, profileImage, medicalHistory, allergies) + CRUD under
  `routes/patient.routes.js` / `controllers/patient.controller.js`, mounted in `server.js`,
  guarded with `protect` + `requirePermission('patients', 'read'|'write')` (Phase 08 middleware
  already exists). Frontend swaps `hooks/useAdminStats.js` → `api.get('/stats/admin')` when
  enough models exist (swap plan in `utils/mockAdminStats.js`).
  Commit: `feat: add patient management`.

## 1. High-Level Structure

```text
MediCare/
├── backend/          Node.js + Express + Mongoose API (port 5000)
├── frontend/         React + Vite + Tailwind CSS v4 SPA (port 5173)
├── ARCHITECTURE.md   This file
├── prompt.md         45-phase master prompt
└── .gitignore        Root ignore rules (env, node_modules, dist, uploads)
```

Git: 12 commits, branch `main`, remote `github.com/rohan-gupta-14/MediCare.git`; working tree has Phase 08 changes uncommitted.
No monorepo root `package.json` — backend and frontend are independent npm projects.

## 2. Backend (Express)

```text
backend/
├── server.js                    Express app: CORS, JSON parsing, /api/health,
│                                404 handler, global error handler, route
│                                placeholders commented per phase
├── config/permissions.js        DONE (Phase 08) — RBAC matrix: RESOURCES (15), ACTIONS (read/write),
│                                ROLE_PERMISSIONS (admin `*`), can(), effectivePermissions()
├── config/db.js                 DONE (Phase 04) — connectDB(): validates MONGO_URI,
│                                10s serverSelection timeout, lifecycle event logs,
│                                returns true/false (never throws)
├── middleware/auth.middleware.js DONE (Phase 06/08) — protect() verifies Bearer JWT, loads user,
│                                rejects inactive accounts; authorizeRoles(...roles) → 403;
│                                requirePermission(resource, action) → 403 via config/permissions.js
├── utils/apiResponse.js         DONE — successResponse()/errorResponse() helpers
├── controllers/auth.controller.js DONE (Phase 06) — register (manual validation, 409 on dup
│                                email, hashes via model hook), login (identical 401 message for
│                                wrong pw vs unknown email), getMe
├── routes/auth.routes.js        DONE (Phase 06/08) — POST /register, POST /login, GET /me,
│                                GET /permissions (all protected except register/login)
├── controllers/.gitkeep         Empty — more controllers from Phase 11 on
├── models/User.model.js        DONE (Phase 05) — User schema: name/email/password/phone/
│                                role/profileImage/isActive + timestamps; roles enum (admin,
│                                doctor, patient, receptionist, pharmacist, lab_technician);
│                                bcryptjs hashing; matchPassword(); password never returned
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
├── main.jsx              BrowserRouter + AuthProvider + App
├── App.jsx               Routes: "/" → Home, /login, /register, /unauthorized; ProtectedRoute
│                         → MainLayout → /dashboard + /admin (RequireRole(['admin']), lazy);
│                         "*" → 404
├── index.css             @import "tailwindcss" (Tailwind v4 via @tailwindcss/vite)
├── components/Navbar.jsx DONE — public navbar, mobile menu, hide/show styles; auth-aware
│                         since Phase 07 (shows name + Logout when logged in)
├── components/Sidebar.jsx DONE (Phase 09) — role-aware nav sections (visibleNavSections),
│                         desktop rail + mobile drawer, "Soon" badges for unbuilt routes
├── components/Header.jsx DONE (Phase 09) — sticky top bar: hamburger, route-derived title,
│                         NotificationBell + UserMenu
├── components/UserMenu.jsx DONE (Phase 09) — initials avatar dropdown (Dashboard, Profile
│                         "Soon", logout via window.location.assign('/'))
├── components/NotificationBell.jsx DONE (Phase 09) — notification dropdown shell w/ empty
│                         state; unread count + mark-as-read → Phase 38
├── components/StatCard.jsx DONE (Phase 10) — reusable metric card (icon chip + value + hint,
│                         tone variants); used by AdminDashboard
├── components/ProtectedRoute.jsx DONE (Phase 07) — guard: loading screen → /login redirect
│                         with state.from → <Outlet />
├── components/RequireRole.jsx DONE (Phase 08) — role guard for nested routes: wrong role →
│                         /unauthorized; nest inside ProtectedRoute
├── utils/permissions.js   DONE (Phase 08) — UI mirror of RBAC matrix, can(),
│                         accessibleModules(), roleHome(role) (Phase 10: admin → /admin);
│                         MODULE_LABELS; + ROLE_LABELS/roleLabel() (Phase 09)
├── utils/navigation.js   DONE (Phase 09) — NAV_SECTIONS (icon + module + path + enabled +
│                         roles allow-list), visibleNavSections(role), titleForPath(pathname)
├── utils/mockAdminStats.js DONE (Phase 10) — sample admin figures + 6-month series; swap
│                         plan for GET /api/stats/admin once Phases 11–33 models exist
├── pages/Unauthorized.jsx DONE (Phase 08) — 403 page (role shown, back-to-dashboard link)
├── layouts/MainLayout.jsx DONE (Phase 09) — sidebar + sticky header + page container shell
├── pages/Home.jsx        Renders only <Navbar /> — landing page not built yet
├── pages/Login.jsx       DONE (Phase 07) — email/password, backend error display, redirects
│                         to state.from or /dashboard on success
├── pages/Register.jsx    DONE (Phase 07) — name/email/phone/password+confirm (client
│                         validation), creates patient account, auto-login
├── pages/Dashboard.jsx   PLACEHOLDER (Phase 07, restyled Phase 09) — welcome card + access
│                         chips + logout; admin analytics live at /admin since Phase 10
├── pages/AdminDashboard.jsx DONE (Phase 10) — 7 stat cards + 3 Recharts charts (area/bar/
│                         line), sample-data chip, skeleton loading; lazy-loaded chunk
├── context/AuthContext.jsx DONE (Phase 07) — AuthProvider: user/token/loading state, login(),
│                         register(), logout(), session restore via GET /auth/me; token stored
│                         raw in localStorage (`medicare_token`), user JSON (`medicare_user`)
├── services/api.js       DONE — Axios: baseURL from VITE_API_URL (fallback localhost:5000/api),
│                         Bearer-token request interceptor, 401 response interceptor (clears
│                         session + redirects to /login, except on /auth/login|/auth/register
│                         attempts so those pages can show their own error)
├── hooks/useLocalStorage.js  DONE
├── hooks/useAdminStats.js    DONE (Phase 10) — admin dashboard data hook (400 ms simulated
│                         fetch → skeleton); swap body for api.get('/stats/admin') later
├── utils/formatDate.js        DONE — formatDate, formatDateTime, getAge (en-IN)
├── assets/               60+ images + dummyStyles.js (1,529 lines of ready-made
│                         Tailwind style objects: tables, cards, forms, modals,
│                         toasts, dashboard styles)
└── eslint.config.js
```

Verified: `npm run lint` = 0 errors; `npm run build` succeeds (main 350 kB JS / 86 kB CSS +
lazy AdminDashboard chunk 409 kB — Recharts split out).

Stack notes:
- **Tailwind CSS v4 is already integrated** → we keep it instead of plain CSS/CSS Modules (compatible substitution allowed by the master prompt).
- lucide-react, axios, react-router-dom already installed. **recharts ^3.10.1 installed (Phase 10)**.

## 4. Phase Status Map (45 phases)

| Phase | Feature | Status |
|-------|---------|--------|
| 01 | Project audit | ✅ Done (this document) |
| 02 | Architecture & cleanup | ✅ Done — `models/`, `routes/`, `services/`, `styles/` created; Clerk leftover `frontend/.env` untracked+deleted; 3 lint errors fixed (`npm run lint` = 0 errors) |
| 03 | Environment config | ✅ Done — `backend/.env` (dev values + random JWT secret, ignored), `backend/.env.example` complete, `frontend/.env.example` + `frontend/.env` with `VITE_API_URL`; verified: no `.env` tracked, both ignored, backend boots from `.env`, Vite `loadEnv` resolves the var |
| 04 | MongoDB connection | ✅ Done — `connectDB()` wired into `server.js` startup (dev warns + boots, prod exits 1), `/api/health` reports `database` state; verified live: connected to local Compass MongoDB `medicare` DB, failure paths (empty/bad URI) tested |
| 05 | User model | ✅ Done — `User.model.js`: 7 fields + timestamps, 6 roles enum, bcryptjs hashing (pre-save + update hooks), matchPassword(), password never serialized (`select:false` + toJSON transform), unique lowercase email; verified live against local DB |
| 06 | Backend auth (JWT) | ✅ Done — `/api/auth/register|login|me`, protect + authorizeRoles middleware, JWT signed with id+role (JWT_EXPIRES), safe responses (password never serialized), validation + E11000/ValidationError mapping; verified live 23/23 |
| 07 | Frontend auth | ✅ Done — AuthProvider (login/register/logout + /me session restore), Login/Register pages (shared `loginPageStyles`), ProtectedRoute guard, placeholder Dashboard, Navbar auth-aware, api.js interceptor fixed; lint 0 errors, build ok, headless-Chrome smoke verified |
| 08 | Role-based access | ✅ Done — `config/permissions.js` matrix (15 resources, 6 roles, admin `*`), `requirePermission()` middleware, `GET /api/auth/permissions`; frontend `RequireRole` + `/unauthorized` + `accessibleModules()` chips; verified 32/32 + headless-Chrome smoke |
| 09 | Dashboard layout | ✅ Done — MainLayout shell + Sidebar/Header/UserMenu/NotificationBell + navigation.js; logout race fixed; lint 0, build ok, CDP smoke 73/73 across 3 roles |
| 10 | Admin dashboard | ✅ Done — `/admin` behind `RequireRole(['admin'])` (lazy Recharts chunk), 7 stat cards + 3 charts via `useAdminStats()` (sample data until Phases 11–33, swap plan in `mockAdminStats.js`), role-aware sidebar item, `roleHome('admin') → /admin`, Login/Register `<Navigate>` race fixed; lint 0, build ok (350 kB main / 409 kB admin chunk), CDP smoke 43/43 across 4 modes |
| 10 | Admin dashboard | ⬜ |
| 11–42 | Models/UI/features | ⬜ Not started (next: Phase 11 Patient model & API) |
| 43 | UI polish | ⬜ dummyStyles.js gives a head start |
| 44 | E2E testing | ⬜ No test files exist yet |
| 45 | Deployment | ⬜ No vercel.json / render.yaml yet |

Public landing page (hero, services, doctors sections) is **not built** — only assets exist.

## 5. Security / Config Findings

1. ~~**`frontend/.env` is tracked by git**~~ → **FIXED in Phase 02**: file untracked and deleted (it only contained a dead `VITE_CLERK_PUBLISHABLE_KEY`). No `.env` files are tracked anymore.
2. ~~**Clerk is a dead leftover**~~ → **REMOVED in Phase 02**: `.env` gone, no Clerk package in `package.json`, no source file imports Clerk. Auth is JWT per Phases 06–08.
3. ~~Backend has **no `.env`**~~ → **FIXED in Phase 03**: `backend/.env` created (git-ignored) with dev PORT/NODE_ENV/JWT values; **`MONGO_URI` set in Phase 04** — local MongoDB Compass (`localhost:27017/medicare`); switch to Atlas string later for deployment.
4. ~~`services/api.js` redirects to `/login` on 401, but `/login` route doesn't exist~~ → **FIXED in Phase 07**: `/login`, `/register` routes + pages exist; interceptor no longer hijacks failed login attempts.

## 6. Known Issues

**Fixed in Phase 02:**
- ~~unused `MainLayout` import in `App.jsx`~~
- ~~unused `useRef` import in `Navbar.jsx`~~
- ~~`react-refresh/only-export-components` in `AuthContext.jsx`~~ → `useAuth` split into `src/hooks/useAuth.js`

**Open:**
- Navbar links (`/doctors`, `/services`, `/appointments`, `/contact`) and Login button (`/login`) all hit the 404 route — fixed as Phases 07/09/landing page land
- Stack decisions confirmed: **Tailwind** (not CSS Modules), **bcryptjs** (not bcrypt)
