/** 
 * LabTests — Lab test management list (Phase 22)
 * 
 * - Server-driven table: search, status filter, pagination — all via GET /api/lab-tests (Phase 22).
 * - Add / Edit via LabTestFormModal, delete via ConfirmDialog — only when
 *   the role holds `labTests:write` (UI mirror of the Phase 08 matrix;
 *   the API enforces it again).
 * - Row click → /lab-tests/:id (Lab test details).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';
import LabTestFormModal from '../components/LabTestFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 10;

const LabTests = () => {
  const { role } = useAuth();
  const canWrite = can(role, 'labTests:write');

  const [data, setData] = useState({
    labTests: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('-orderedDate');
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(searchTerm && { q: searchTerm }),
      ...(sort && { sort }),
    }),
    [page, searchTerm, sort]
  );

  useEffect(() => {
    const seq = ++seqRef.current;
    requestLabTests(params)
      .then((res) => {
        if (seq !== seqRef.current) return;
        setData(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setError(err.response?.data?.message || 'Could not load lab tests.');
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  const requestLabTests = (p) => api.get('/lab-tests', { params: p });

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await requestLabTests(params);
      if (seq === seqRef.current) {
        setData(res.data.data);
        setError('');
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setError(err.response?.data?.message || 'Could not load lab tests.');
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [params]);

  const { labTests, pagination } = data;

  const filtersActive = Boolean(searchTerm || sort !== '-orderedDate');

  const clearFilters = () => {
    setLoading(true);
    setSearchTerm('');
    setSort('-orderedDate');
    setPage(1);
  };

  const handleSaved = (labTest, mode) => {
    setModalOpen(false);
    setEditing(null);
    showToast('success', mode === 'created' ? `${labTest.patient.name}'s lab test created` : 'Changes saved');
    setLoading(true);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/lab-tests/${deleteTarget._id}`);
      setDeleteTarget(null);
      showToast('success', `${deleteTarget.patient.name}'s lab test deleted`);
      setLoading(true);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not delete the lab test.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Lab Tests</h1>
          <p className="text-sm text-emerald-700">
            {loading ? 'Loading…' : `${pagination.total} lab test${pagination.total === 1 ? '' : 's'} on record`}
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
            Add lab test
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test name or patient…"
            aria-label="Search lab tests"
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
                <th className="px-4 py-3 font-semibold">Test Name</th>
                <th className="px-4 py-3 font-semibold">Test Type</th>
                <th className="px-4 py-3 font-semibold">Ordered Date</th>
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
                labTests.map((l) => (
                  <tr key={l._id} className="transition hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {initials(l.patient.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            to `/lab-tests/${l._id}`
                            className="block truncate font-semibold text-emerald-900 hover:underline"
                          >
                            {l.patient.name}
                          </Link>
                          <span className="block truncate text-xs text-gray-500">{l.patient.patientId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800">
                        {l.patient.patientId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{l.testName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{l.testType || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(l.orderedDate)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-1 text-xs font-bold ${
                        l.status === 'pending'
                          ? 'bg-emerald-100 text-emerald-800'
                        : l.status === 'processing'
                          ? 'bg-emerald-200 text-emerald-700'
                        : l.status === 'completed'
                          ? 'bg-rose-100 text-rose-800'
                        : 'bg-gray-100 text-gray-700'
                      }">
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to `/lab-tests/${l._id}`
                          title="View details"
                          aria-label={`View ${l.patient.name}'s lab test`}
                          className="rounded-full p-2 text-emerald-600 transition:hover:bg-emerald-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              title="Edit lab test"
                              aria-label={`Edit ${l.patient.name}'s lab test`}
                              onClick={() => {
                                setEditing(l);
                                setModalOpen(true);
                              }}
                              className="rounded-full p-2 text-indigo-600 transition:hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete lab test"
                              aria-label={`Delete ${l.patient.name}'s lab test`}
                              onClick={() => setDeleteTarget(l)}
                              className="rounded-full p-2 text-rose-600 transition:hover:bg-rose-50"
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
        {!loading && !error && labTests.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-semibold text-emerald-900">
              {filtersActive ? 'No lab tests match your search' : 'No lab tests yet'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {filtersActive
                ? 'Try a different term or clear the filters.'
                : canWrite
                  ? 'Add the first lab test to get started.'
                  : 'Lab tests will appear here once a doctor or receptionist adds them.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {labTests.length} of {pagination.total} · Page {pagination.page} of {pagination.totalPages}
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
        <LabTestFormModal
          key={editing?._id || 'new'}
          labTest={editing}
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
        title="Delete lab test?"
        message={
          deleteTarget
            ? `${deleteTarget.patient.name}'s lab test will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete lab test"
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

export default LabTests;