/**
 * Register — Registration page (Phase 07)
 *
 * Public registration creates a patient account (backend default role).
 * Staff roles (doctor, admin, …) are created by an admin in Phase 10.
 * On success, the user is logged in immediately (token returned) and
 * sent to /dashboard.
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { loginPageStyles as styles } from '../assets/dummyStyles';
import useAuth from '../hooks/useAuth';

const Register = () => {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → nothing to register
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      return 'Name is required (min 2 characters)';
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return 'A valid email is required';
    }
    if (form.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to register. Please try again.');
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

        <h2 className={styles.title}>Create your account</h2>
        <p className={styles.subtitle}>Join MediCare to book appointments &amp; more</p>

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
            <label htmlFor="name" className="block text-sm font-medium text-emerald-800 mb-1 ml-4">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

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
            <label htmlFor="phone" className="block text-sm font-medium text-emerald-800 mb-1 ml-4">
              Phone <span className="text-green-500 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
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
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-emerald-800 mb-1 ml-4">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`${styles.submitButton} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-green-700 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
