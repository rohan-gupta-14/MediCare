import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

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
          Every dashboard page nests inside <MainLayout /> (sidebar + header).
          Phase 08: role-scoped routes nest RequireRole inside ProtectedRoute —
          import { RequireRole } from './components/RequireRole' and use
          <Route element={<RequireRole roles={['admin']} />}> for /admin (Phase 10). */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Future dashboard pages (Phase 10+) go inside this layout:
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route> */}
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