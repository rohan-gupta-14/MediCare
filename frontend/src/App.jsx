import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Doctors from './pages/Doctors';
import DoctorDetails from './pages/DoctorDetails';
import Departments from './pages/Departments';
import DepartmentDetails from './pages/DepartmentDetails';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import MainLayout from './layouts/MainLayout';

// Lazy-loaded: pulls Recharts (~200 kB) out of the main bundle so public
// pages and other dashboards don't pay for the admin charts.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// ────────────────────────────────────────────────
// Routes will expand across Phases 07 – 44.
// Each phase adds routes as features are built.
// ────────────────────────────────────────────────

const App = () => {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Home />} />

      {/* Auth pages — Phase 07 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 403 fallback — Phase 08 */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected dashboard area — Phase 07 guard + Phase 09 layout shell.
          Every dashboard page nests inside <MainLayout /> (sidebar + header). */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Phase 10 — admin analytics, role-scoped via RequireRole (Phase 08).
              Wrong role → /unauthorized. Future role dashboards follow the
              same pattern (doctor Phase 19, patient Phase 20). */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route
              path="/admin"
              element={
                <Suspense
                  fallback={
                    <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-emerald-600 animate-pulse">
                      Loading dashboard…
                    </div>
                  }
                >
                  <AdminDashboard />
                </Suspense>
              }
            />
          </Route>

          {/* Phase 12 — patient management. Roles come straight from the
              Phase 08 matrix: admin/receptionist hold patients:write,
              doctor patients:read only (the API re-checks both). */}
          <Route element={<RequireRole roles={['admin', 'receptionist', 'doctor']} />}>
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetails />} />
          </Route>

          {/* Phase 14 — doctor management. Admin-only: the Phase 08 matrix
              grants doctors:* to admin alone (sidebar hides it for others). */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorDetails />} />
          </Route>

          {/* Phase 15 — department management. Admin-only: the Phase 08
              matrix grants departments:* to admin alone. */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/departments" element={<Departments />} />
            <Route path="/departments/:id" element={<DepartmentDetails />} />
          </Route>
        </Route>
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center text-center">
          <div>
            <h1 className="text-6xl font-bold text-emerald-600">404</h1>
            <p className="text-xl text-gray-600 mt-4">Page not found</p>
            <a href="/" className="mt-6 inline-block text-emerald-600 underline">
              Return Home
            </a>
          </div>
        </div>
      } />
    </Routes>
  );
};

export default App;