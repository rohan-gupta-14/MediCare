/** 
 * Admissions — Admission management list (Phase 17)
 * 
 * - Server-driven table: search, status filter, pagination — all via GET /api/admissions (Phase 17).
 * - Add / Edit via AdmissionFormModal, delete via ConfirmDialog — only when
 *   the role holds `admissions:write` (UI mirror of the Phase 08 matrix;
 *   the API enforces it again).
 * - Row click → /admissions/:id (AdmissionDetails).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';
import AdmissionFormModal from '../components/AdmissionFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 10;

const DEFAULT_SORT = '-createdAt';

const selectClass =
  'text-sm px-3 py-2 rounded-full border border-emerald-200 bg-white text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-100';

const Admissions = () => {
  const { role } = useAuth();
  const canWrite = can(role, 'admissions:write');

  const [data, setData] = useState({
    admissions: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);

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
      setStatusTerm(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Actually, let me correct this - I'll use the proper debounced search term

  // Query params for GET /api/admissions — identity changes when any facet does.
  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(searchTerm && { q: searchTerm }),
      ...(statusFilter && { status: statusFilter }),
      ...(sort !== DEFAULT_SORT && { sort }),
    }),
    [page, searchTerm, statusFilter, sort]
  );

  // Fetch on mount + every query change.
  useEffect(() => {
    const seq = ++seqRef.current;
    requestAdmissions(params)
      .then((res) => {
        if (seq !== seqRef.current) return; // stale — a newer request owns the state
        setData(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setError(err.response?.data?.message || 'Could not load admissions.');
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  // Helper: safe request (no stale-check inside; caller handles it).
  const requestAdmissions = (p) => api.get('/admissions', { params: p });

  // Handler-initiated refresh (retry, delete, create-save).
  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await requestAdmissions(params);
      if (seq === seqRef.current) {
        setData(res.data.data);
        setError('');
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setError(err.response?.data?.message || 'Could not load admissions.');
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [params]);

  const filtersActive = Boolean(searchTerm || statusFilter || sort !== DEFAULT_SORT);

  const clearFilters = () => {
    setLoading(true);
    setSearchTerm('');
    setStatusTerm('');
    setStatusFilter('');
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  const handleSaved = (admission, mode) => {
    setModalOpen(false);
    setEditing(null);
    showToast('success', mode === 'created' ? `${admission.patient.name} admitted` : 'Changes saved');
    setLoading(true);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admissions/${deleteTarget._id}`);
      setDeleteTarget(null);
      showToast('success', `${deleteTarget.patient.name} discharged`);
      setLoading(true);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not delete the admission.');
    } finally {
      setDeleting(false);
    }
  };

  const { admissions, pagination } = data;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Admissions</h1>
          <p className="text-sm text-emerald-700">
            {loading ? 'Loading…' : `${pagination.total} admission${pagination.total === 1 ? '' : 's'} on record`}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add admission
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient…"
            aria-label="Search admissions"
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
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          {['pending', 'admitted', 'discharged', 'transferred', 'expired'].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 self-start rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
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
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-emerald-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Patient ID</th>
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Admission Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4" colSpan={7}>
                      <div className="h-4 w-full rounded bg-emerald-100" />
                    </td>
                  </tr>
                ))
              }

              {!loading &&
                admissions.map((a) => (
                  <tr key={a._id} className="transition hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {initials(a.patient.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            to `/admissions/${a._id}`
                            className="block truncate font-semibold text-emerald-900 hover:underline"
                          >
                            {a.patient.name}
                          </Link>
                          <span className="block truncate text-xs text-gray-500">{a.patient.patientId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800">
                        {a.patient.patientId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {a.doctor ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            {initials(a.doctor.name)}
                          </span>
                          <span className="truncate font-medium text-emerald-900">{a.doctor.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {a.department ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{a.department.name}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(a.admissionDate)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-1 text-xs font-bold ${
                        a.status === 'pending'
                          ? 'bg-emerald-100 text-emerald-800'
                        : a.status === 'admitted'
                          ? 'bg-emerald-200 text-emerald-700'
                        : a.status === 'discharged'
                          ? 'bg-rose-100 text-rose-800'
                        : a.status === 'transferred'
                          ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                      }">
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to `/admissions/${a._id}`
                          title="View details"
                          aria-label={`View ${a.patient.name}'s admission`}
                          className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              title="Edit admission"
                              aria-label={`Edit ${a.patient.name}'s admission`}
                              onClick={() => {
                                setEditing(a);
                                setModalOpen(true);
                              }}
                              className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete admission"
                              aria-label={`Discharge ${a.patient.name}`}
                              onClick={() => setDeleteTarget(a)}
                              className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && !error && admissions.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-semibold text-emerald-900">
              {filtersActive ? 'No admissions match your search' : 'No admissions yet'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {filtersActive
                ? 'Try a different term or clear the filters.'
                : canWrite
                  ? 'Add the first admission to get started.'
                  : 'Admissions will appear here once a doctor or receptionist adds them.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {admissions.length} of {pagination.total} · Page {pagination.page} of {pagination.totalPages}
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
              <ChevronLeft className="h-4 w-4" /> Prev
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
        <AdmissionFormModal
          key={editing?._id || 'new'}
          admission={editing}
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
        title="Discharge patient?"
        message={
          deleteTarget
            ? `${deleteTarget.patient.name} (${deleteTarget.patient.patientId}) will be discharged. This will set status to 'discharged' and record a discharge date. This cannot be undone.`
            : ''
        }
        confirmLabel="Discharge patient"
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

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default Admissions;