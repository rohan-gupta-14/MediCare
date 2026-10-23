/**
 * DepartmentDetails — Single department profile (Phase 15)
 *
 * Fetched by ObjectId (`/departments/:id`). Shows the department header,
 * description, location, status and the head-doctor card (linked to their
 * doctor profile). Admins with `departments:write` can edit
 * (DepartmentFormModal) or delete (ConfirmDialog) from here.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  MapPin,
  Pencil,
  Stethoscope,
  Trash2,
  UserRound,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';
import { statusLabel } from '../utils/departmentOptions';
import DepartmentFormModal from '../components/DepartmentFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

/** Pure request helper (no state) — safe to call from the effect. */
const requestDepartment = (id) => api.get(`/departments/${id}`);

const SectionCard = ({ title, children }) => (
  <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-700">{title}</h2>
    {children}
  </section>
);

const DepartmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canWrite = can(role, 'departments:write');

  const [department, setDepartment] = useState(null);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (type, text) => {
    setToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // `loading` is derived, not stored: setState may only happen in promise
  // callbacks (react-hooks/set-state-in-effect), and "nothing loaded yet and
  // no error" is exactly the loading condition.
  const loading = !department && !error;

  // Fetch on mount / id change — chain inline with setState only in callbacks.
  useEffect(() => {
    let active = true;
    requestDepartment(id)
      .then((res) => {
        if (!active) return;
        setDepartment(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Could not load this department.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Handler-initiated refresh (retry buttons).
  const load = useCallback(async () => {
    try {
      const res = await requestDepartment(id);
      setDepartment(res.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this department.');
    }
  }, [id]);

  const handleSaved = () => {
    setEditOpen(false);
    showToast('success', 'Changes saved');
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/departments/${department._id}`);
      navigate('/departments');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the department.');
      setDeleteOpen(false);
      setDeleting(false);
    }
  };

  // ── States ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4">
        <div className="h-8 w-56 rounded bg-emerald-100" />
        <div className="h-40 rounded-2xl bg-emerald-100" />
        <div className="h-40 rounded-2xl bg-emerald-100" />
      </div>
    );
  }

  if (error && !department) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-gray-900">Department not found</h1>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setError('');
              load();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Retry
          </button>
          <Link
            to="/departments"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to departments
          </Link>
        </div>
      </div>
    );
  }

  const head = department.headDoctor;

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Breadcrumb */}
      <Link
        to="/departments"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All departments
      </Link>

      {/* Profile header */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Building2 className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-emerald-950">{department.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    department.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      department.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}
                  />
                  {statusLabel(department.status)}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                {department.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    {department.location}
                  </span>
                )}
                <span className="text-gray-400">· Created {formatDate(department.createdAt)}</span>
              </p>
            </div>
          </div>

          {canWrite && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* About */}
        <SectionCard title="About">
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {department.description || 'No description provided.'}
          </p>
          <div className="mt-4 flex items-center gap-2 border-t border-emerald-50 pt-4 text-xs text-gray-500">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
            Last updated {formatDate(department.updatedAt)}
          </div>
        </SectionCard>

        {/* Head doctor */}
        <SectionCard title="Head doctor">
          {head ? (
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <Link
                  to={`/doctors/${head.doctorId}`}
                  className="block font-semibold text-emerald-900 hover:underline"
                >
                  {head.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {head.specialization}
                  {head.doctorId && ` · ${head.doctorId}`}
                </p>
                {head.email && <p className="truncate text-xs text-gray-400">{head.email}</p>}
              </div>
            </div>
          ) : (
            <div className="py-2 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-400">
                <Stethoscope className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-gray-600">No head doctor assigned</p>
              <p className="mt-1 text-xs text-gray-400">
                Use Edit to assign one — a doctor may head at most one department.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <DepartmentFormModal
          key={department._id}
          department={department}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete department?"
        message={`${department.name} will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete department"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default DepartmentDetails;
