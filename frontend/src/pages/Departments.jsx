/**
 * Departments — Department management list (Phase 15)
 *
 * - Server-driven table: search (debounced), status filter, sort order,
 *   pagination — all via GET /api/departments.
 * - Add / Edit via DepartmentFormModal, delete via ConfirmDialog — only when
 *   the role holds `departments:write` (UI mirror of the Phase 08 matrix;
 *   the API enforces it again).
 * - Row click → /departments/:id (DepartmentDetails).
 *
 * Route is admin-only (RequireRole in App.jsx): the Phase 08 matrix grants
 * departments:* to admin alone, but the page still gates on `can()` so the
 * UI stays correct if the matrix ever widens.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';
import { DEPARTMENT_STATUSES, statusLabel } from '../utils/departmentOptions';
import DepartmentFormModal from '../components/DepartmentFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 10;

// Sort keys must exist in the backend SORTS whitelist (department.controller.js)
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
];

const DEFAULT_SORT = '-createdAt';

/** Pure request helper (no state) — safe to call from the effect. */
const requestDepartments = (params) => api.get('/departments', { params });

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
      status === 'active'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-gray-100 text-gray-500'
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}
    />
    {statusLabel(status)}
  </span>
);

const selectClass =
  'text-sm px-3 py-2 rounded-full border border-emerald-200 bg-white text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-100';

const Departments = () => {
  const { role } = useAuth();
  const canWrite = can(role, 'departments:write');

  const [data, setData] = useState({
    departments: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
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
      setQ(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query params for GET /api/departments — identity changes when any facet does.
  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(q && { q }),
      ...(status && { status }),
      ...(sort !== DEFAULT_SORT && { sort }),
    }),
    [page, q, status, sort]
  );

  // Fetch on mount + every query change. The chain is inline in the effect
  // with setState only in promise callbacks — invoking a setState-bearing
  // helper straight from an effect trips react-hooks/set-state-in-effect.
  // (`load` below is the same refresh, for event handlers only.)
  useEffect(() => {
    const seq = ++seqRef.current;
    requestDepartments(params)
      .then((res) => {
        if (seq !== seqRef.current) return; // stale — a newer request owns the state
        setData(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setError(err.response?.data?.message || 'Could not load departments.');
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  // Handler-initiated refresh (retry, delete, create-save).
  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await requestDepartments(params);
      if (seq === seqRef.current) {
        setData(res.data.data);
        setError('');
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setError(err.response?.data?.message || 'Could not load departments.');
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [params]);

  const filtersActive = Boolean(q || status || sort !== DEFAULT_SORT);

  const clearFilters = () => {
    setLoading(true);
    setSearchTerm('');
    setQ('');
    setStatus('');
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  const handleSaved = (department, mode) => {
    setModalOpen(false);
    setEditing(null);
    showToast('success', mode === 'created' ? `${department.name} added` : 'Changes saved');
    if (mode === 'created' && (q || status || sort !== DEFAULT_SORT || page !== 1)) {
      // Reset the view so the freshly created (newest-first) row is visible
      setLoading(true);
      setSearchTerm('');
      setQ('');
      setStatus('');
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
      await api.delete(`/departments/${deleteTarget._id}`);
      setDeleteTarget(null);
      showToast('success', `${deleteTarget.name} deleted`);
      setLoading(true);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not delete the department.');
    } finally {
      setDeleting(false);
    }
  };

  const { departments, pagination } = data;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Departments</h1>
          <p className="text-sm text-emerald-700">
            {loading
              ? 'Loading…'
              : `${pagination.total} department${pagination.total === 1 ? '' : 's'} on record`}
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
            Add department
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
            placeholder="Search name, location or description…"
            aria-label="Search departments"
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
          value={status}
          onChange={(e) => {
            setLoading(true);
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          {DEPARTMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
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
          aria-label="Sort departments"
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-emerald-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Head doctor</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4" colSpan={6}>
                      <div className="h-4 w-full rounded bg-emerald-100" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                departments.map((d) => (
                  <tr key={d._id} className="transition hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <Link
                            to={`/departments/${d._id}`}
                            className="block truncate font-semibold text-emerald-900 hover:underline"
                          >
                            {d.name}
                          </Link>
                          {d.description && (
                            <span className="block max-w-xs truncate text-xs text-gray-500">
                              {d.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {d.headDoctor ? (
                        <Link
                          to={`/doctors/${d.headDoctor.doctorId}`}
                          className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                        >
                          <UserRound className="h-3.5 w-3.5" />
                          {d.headDoctor.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {d.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                          {d.location}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/departments/${d._id}`}
                          title="View details"
                          aria-label={`View ${d.name}`}
                          className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              title="Edit department"
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
                              title="Delete department"
                              aria-label={`Delete ${d.name}`}
                              onClick={() => setDeleteTarget(d)}
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
        {!loading && !error && departments.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Building2 className="h-6 w-6" />
            </span>
            <p className="font-semibold text-emerald-900">
              {filtersActive ? 'No departments match your search' : 'No departments yet'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {filtersActive
                ? 'Try a different term or clear the filters.'
                : canWrite
                  ? 'Add the first department to get started.'
                  : 'Departments will appear here once an admin adds them.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {departments.length} of {pagination.total} · Page {pagination.page} of{' '}
            {pagination.totalPages}
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
        <DepartmentFormModal
          key={editing?._id || 'new'}
          department={editing}
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
        title="Delete department?"
        message={
          deleteTarget
            ? `${deleteTarget.name} will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete department"
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

export default Departments;
