import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

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

      {/* Protected dashboard — Phase 07 placeholder.
          Phase 09 wraps this in <MainLayout /> for the full sidebar layout. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
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