/**
 * Doctors — Doctor management list (Phase 14)
 *
 * - Card grid (default) + table view toggle — both are spec deliverables
 *   ("doctor cards" + "doctor table").
 * - Server-driven: debounced search, specialization filter, sort order,
 *   pagination — all via GET /api/doctors (Phase 13).
 * - Add / Edit via DoctorFormModal, delete via ConfirmDialog.
 * - Route is admin-only (RequireRole in App.jsx): the Phase 08 matrix gives
 *   admin the sole `doctors:*` grants, so no in-page gating is needed.
 *
 * Fetch pattern note (react-hooks v7 `set-state-in-effect`): the promise
 * chain lives inline in the effect with setState only in callbacks; `load`
 * is reserved for event handlers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  IndianRupee,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import api from '../services/api';
import { SPECIALIZATIONS, dayLabel, formatInr } from '../utils/doctorOptions';
import DoctorFormModal from '../components/DoctorFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 12;

// Sort keys must exist in the backend SORTS whitelist (doctor.controller.js)
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: '-experience', label: 'Experience: high to low' },
  { value: 'experience', label: 'Experience: low to high' },
  { value: 'consultationFee', label: 'Fee: low to high' },
  { value: '-consultationFee', label: 'Fee: high to low' },
];

const DEFAULT_SORT = '-createdAt';

/** Pure request helper (no state) — safe to call from the effect. */
const requestDoctors = (params) => api.get('/doctors', { params });

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const selectClass =
  'text-sm px-3 py-2 rounded-full border border-emerald-200 bg-white text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-100';

const Avatar = ({ doctor, className = 'h-12 w-12 text-sm' }) =>
  doctor.profileImage ? (
    <img
      src={doctor.profileImage}
      alt={doctor.name}
      className={`${className} shrink-0 rounded-full border border-emerald-100 object-cover`}
    />
  ) : (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 ${className}`}
    >
      {initials(doctor.name)}
    </span>
  );

const DoctorCard = ({ doctor, onEdit, onDelete }) => (
  <div className="flex flex-col rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md">
    <div className="flex items-start gap-3">
      <Avatar doctor={doctor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/doctors/${doctor.doctorId}`}
            className="truncate font-bold text-emerald-900 hover:underline"
          >
            {doctor.name}
          </Link>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
            {doctor.doctorId}
          </span>
        </div>
        <p className="truncate text-sm font-medium text-emerald-700">{doctor.specialization}</p>
        <p className="truncate text-xs text-gray-500">
          {doctor.department || 'No department'}
          {doctor.experience > 0 && ` · ${doctor.experience} yrs exp`}
        </p>
      </div>
    </div>

    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
        <IndianRupee className="h-3.5 w-3.5" />
        {formatInr(doctor.consultationFee)}
      </span>
      {doctor.availability?.length > 0 ? (
        <span className="flex flex-wrap justify-end gap-1">
          {doctor.availability.map((slot) => (
            <span
              key={slot.day}
              title={`${slot.startTime}–${slot.endTime}`}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                slot.isAvailable === false
                  ? 'bg-gray-100 text-gray-400 line-through'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {dayLabel(slot.day)}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-xs text-gray-400">No schedule</span>
      )}
    </div>

    <div className="mt-4 flex items-center justify-end gap-1 border-t border-emerald-50 pt-3">
      <Link
        to={`/doctors/${doctor.doctorId}`}
        title="View profile"
        aria-label={`View ${doctor.name}`}
        className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-100"
      >
        <Eye className="h-4 w-4" />
      </Link>
      <button
        type="button"
        title="Edit doctor"
        aria-label={`Edit ${doctor.name}`}
        onClick={() => onEdit(doctor)}
        className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Delete doctor"
        aria-label={`Delete ${doctor.name}`}
        onClick={() => onDelete(doctor)}
        className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const Doctors = () => {
  const [data, setData] = useState({
    doctors: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [q, setQ] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('cards');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const seqRef = useRef(0);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (type, text) => {
    setToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Debounce the search box → server query (300 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query params for GET /api/doctors — identity changes when any facet does.
  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(q && { q }),
      ...(specialization && { specialization }),
      ...(sort !== DEFAULT_SORT && { sort }),
    }),
    [page, q, specialization, sort]
  );

  // Fetch on mount + every query change (inline chain — see file header).
  useEffect(() => {
    const seq = ++seqRef.current;
    requestDoctors(params)
      .then((res) => {
        if (seq !== seqRef.current) return; // stale — a newer request owns the state
        setData(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setError(err.response?.data?.message || 'Could not load doctors.');
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  // Handler-initiated refresh (retry, delete, create-save).
  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await requestDoctors(params);
      if (seq === seqRef.current) {
        setData(res.data.data);
        setError('');
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setError(err.response?.data?.message || 'Could not load doctors.');
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [params]);

  const filtersActive = Boolean(q || specialization || sort !== DEFAULT_SORT);

  const clearFilters = () => {
    setLoading(true);
    setSearchTerm('');
    setQ('');
    setSpecialization('');
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  const handleSaved = (doctor, mode) => {
    setModalOpen(false);
    setEditing(null);
    showToast('success', mode === 'created' ? `${doctor.name} added` : 'Changes saved');
    if (mode === 'created' && (q || specialization || sort !== DEFAULT_SORT || page !== 1)) {
      // Reset the view so the freshly created (newest-first) card is visible
      setLoading(true);
      setSearchTerm('');
      setQ('');
      setSpecialization('');
      setSort(DEFAULT_SORT);
      setPage(1);
    } else {
      setLoading(true);
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/doctors/${deleteTarget.doctorId}`);
      setDeleteTarget(null);
      showToast('success', `${deleteTarget.name} deleted`);
      setLoading(true);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not delete the doctor.');
    } finally {
      setDeleting(false);
    }
  };

  const { doctors, pagination } = data;

  const viewToggle = (value, Icon, label) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === value}
      onClick={() => setView(value)}
      title={label}
      className={`rounded-full p-2 transition ${
        view === value
          ? 'bg-emerald-600 text-white'
          : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Doctors</h1>
          <p className="text-sm text-emerald-700">
            {loading ? 'Loading…' : `${pagination.total} doctor${pagination.total === 1 ? '' : 's'} on record`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="View mode">
            {viewToggle('cards', LayoutGrid, 'Cards view')}
            {viewToggle('table', List, 'Table view')}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add doctor
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, ID or specialization…"
            aria-label="Search doctors"
            className="w-full rounded-full border border-emerald-200 bg-white py-2 pl-10 pr-9 text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-emerald-600 hover:text-emerald-900"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={specialization}
          onChange={(e) => {
            setLoading(true);
            setSpecialization(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by specialization"
          className={selectClass}
        >
          <option value="">All specializations</option>
          {SPECIALIZATIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setLoading(true);
            setSort(e.target.value);
            setPage(1);
          }}
          aria-label="Sort doctors"
          className={selectClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 self-start rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && !loading && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError('');
              setLoading(true);
              load();
            }}
            className="inline-flex items-center gap-1 font-semibold underline hover:text-rose-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Cards view */}
      {view === 'cards' && (
        <>
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skeleton-card-${i}`} className="h-44 animate-pulse rounded-2xl bg-emerald-100" />
              ))}
            </div>
          )}
          {!loading && doctors.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {doctors.map((d) => (
                <DoctorCard
                  key={d._id}
                  doctor={d}
                  onEdit={(doc) => {
                    setEditing(doc);
                    setModalOpen(true);
                  }}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Doctor</th>
                  <th className="px-4 py-3 font-semibold">Doctor ID</th>
                  <th className="px-4 py-3 font-semibold">Specialization</th>
                  <th className="px-4 py-3 font-semibold">Experience</th>
                  <th className="px-4 py-3 font-semibold">Fee</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-row-${i}`} className="animate-pulse">
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="h-4 w-full rounded bg-emerald-100" />
                      </td>
                    </tr>
                  ))}

                {!loading &&
                  doctors.map((d) => (
                    <tr key={d._id} className="transition hover:bg-emerald-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar doctor={d} className="h-9 w-9 text-xs" />
                          <div className="min-w-0">
                            <Link
                              to={`/doctors/${d.doctorId}`}
                              className="block truncate font-semibold text-emerald-900 hover:underline"
                            >
                              {d.name}
                            </Link>
                            <span className="block truncate text-xs text-gray-500">{d.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800">
                          {d.doctorId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {d.specialization}
                        {d.department && <span className="block text-xs text-gray-400">{d.department}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {d.experience > 0 ? `${d.experience} yrs` : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-800">{formatInr(d.consultationFee)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/doctors/${d.doctorId}`}
                            title="View profile"
                            aria-label={`View ${d.name}`}
                            className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            title="Edit doctor"
                            aria-label={`Edit ${d.name}`}
                            onClick={() => {
                              setEditing(d);
                              setModalOpen(true);
                            }}
                            className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete doctor"
                            aria-label={`Delete ${d.name}`}
                            onClick={() => setDeleteTarget(d)}
                            className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && doctors.length === 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Stethoscope className="h-6 w-6" />
          </span>
          <p className="font-semibold text-emerald-900">
            {filtersActive ? 'No doctors match your search' : 'No doctors yet'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {filtersActive ? 'Try a different term or clear the filters.' : 'Add the first doctor to get started.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {doctors.length} of {pagination.total} · Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((n) => Math.max(1, n - 1));
              }}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((n) => Math.min(pagination.totalPages, n + 1));
              }}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <DoctorFormModal
          key={editing?._id || 'new'}
          doctor={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete doctor?"
        message={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.doctorId}) will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete doctor"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
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

export default Doctors;
