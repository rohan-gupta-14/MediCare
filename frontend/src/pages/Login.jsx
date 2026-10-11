/**
 * Login — Login page (Phase 07)
 *
 * Uses the shared loginPageStyles from dummyStyles.js (Tailwind classes).
 * On success, navigates back to the page the user originally requested
 * (state.from, set by ProtectedRoute) or /dashboard.
 */

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginPageStyles as styles } from '../assets/dummyStyles';
import useAuth from '../hooks/useAuth';

const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → don't show the form
  if (isAuthenticated && !loading) {
    return <Navigate to={from} replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Email and password are required');
      return;
    }

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      // Backend messages: 401 invalid credentials, 403 deactivated, 500 config
      setError(err.response?.data?.message || 'Unable to log in. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.loginCard}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <span className="text-6xl" aria-hidden="true">🏥</span>
        </div>

        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Log in to your MediCare account</p>

        {error && (
          <div
            role="alert"
            className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-emerald-800 mb-1 ml-4">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-emerald-800 mb-1 ml-4">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`${styles.submitButton} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-sm text-green-700 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-emerald-700 underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
