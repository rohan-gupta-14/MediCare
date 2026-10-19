/**
 * Patients — Patient management list (Phase 12)
 *
 * - Server-driven table: search (debounced), gender + blood-group filters,
 *   pagination — all via GET /api/patients (Phase 11).
 * - Add / Edit via PatientFormModal, delete via ConfirmDialog — only when
 *   the role holds `patients:write` (UI mirror of the Phase 08 matrix;
 *   the API enforces it again).
 * - Row click → /patients/:id (PatientDetails).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate, getAge } from '../utils/formatDate';
import PatientFormModal from '../components/PatientFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 10;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

/** Pure request helper (no state) — safe to call from the effect. */
const requestPatients = (params) => api.get('/patients', { params });

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

const Patients = () => {
  const { role } = useAuth();
  const canWrite = can(role, 'patients:write');

  const [data, setData] = useState({
    patients: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
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

  // Query params for GET /api/patients — identity changes when any facet does.
  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(q && { q }),
      ...(gender && { gender }),
      ...(bloodGroup && { bloodGroup }),
    }),
    [page, q, gender, bloodGroup]
  );

  // Fetch on mount + every query change. The chain is inline in the effect
  // with setState only in promise callbacks — invoking a setState-bearing
  // helper straight from an effect trips react-hooks/set-state-in-effect.
  // (`load` below is the same refresh, for event handlers only.)
  useEffect(() => {
    const seq = ++seqRef.current;
    requestPatients(params)
      .then((res) => {
        if (seq !== seqRef.current) return; // stale — a newer request owns the state
        setData(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setError(err.response?.data?.message || 'Could not load patients.');
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  // Handler-initiated refresh (retry, delete, create-save).
  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await requestPatients(params);
      if (seq === seqRef.current) {
        setData(res.data.data);
        setError('');
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setError(err.response?.data?.message || 'Could not load patients.');
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [params]);

  const filtersActive = Boolean(q || gender || bloodGroup);

  const clearFilters = () => {
    setLoading(true);
    setSearchTerm('');
    setQ('');
    setGender('');
    setBloodGroup('');
    setPage(1);
  };

  const handleSaved = (patient, mode) => {
    setModalOpen(false);
    setEditing(null);
    showToast('success', mode === 'created' ? `${patient.name} added` : 'Changes saved');
    if (mode === 'created' && (q || gender || bloodGroup || page !== 1)) {
      // Reset the view so the freshly created (newest-first) row is visible
      setLoading(true);
      setSearchTerm('');
      setQ('');
      setGender('');
      setBloodGroup('');
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
      await api.delete(`/patients/${deleteTarget.patientId}`);
      setDeleteTarget(null);
      showToast('success', `${deleteTarget.name} deleted`);
      setLoading(true);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not delete the patient.');
    } finally {
      setDeleting(false);
    }
  };

  const { patients, pagination } = data;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Patients</h1>
          <p className="text-sm text-emerald-700">
            {loading ? 'Loading…' : `${pagination.total} patient${pagination.total === 1 ? '' : 's'} on record`}
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
            Add patient
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
            placeholder="Search name, email, ID or phone…"
            aria-label="Search patients"
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
          value={gender}
          onChange={(e) => {
            setLoading(true);
            setGender(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by gender"
          className={selectClass}
        >
          <option value="">All genders</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <select
          value={bloodGroup}
          onChange={(e) => {
            setLoading(true);
            setBloodGroup(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by blood group"
          className={selectClass}
        >
          <option value="">All blood groups</option>
          {BLOOD_GROUPS.map((b) => (
            <option key={b} value={b}>
              {b}
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
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Patient ID</th>
                <th className="px-4 py-3 font-semibold">Gender / Age</th>
                <th className="px-4 py-3 font-semibold">Blood</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4" colSpan={7}>
                      <div className="h-4 w-full rounded bg-emerald-100" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                patients.map((p) => (
                  <tr key={p._id} className="transition hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {initials(p.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            to={`/patients/${p.patientId}`}
                            className="block truncate font-semibold text-emerald-900 hover:underline"
                          >
                            {p.name}
                          </Link>
                          <span className="block truncate text-xs text-gray-500">{p.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800">
                        {p.patientId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="capitalize">{p.gender}</span>
                      {getAge(p.dateOfBirth) !== null && <span className="text-gray-400"> · {getAge(p.dateOfBirth)}y</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.bloodGroup ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                          {p.bloodGroup}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/patients/${p.patientId}`}
                          title="View details"
                          aria-label={`View ${p.name}`}
                          className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              title="Edit patient"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => {
                                setEditing(p);
                                setModalOpen(true);
                              }}
                              className="rounded-full p-2 text-indigo-600 transition hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete patient"
                              aria-label={`Delete ${p.name}`}
                              onClick={() => setDeleteTarget(p)}
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
        {!loading && !error && patients.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-semibold text-emerald-900">
              {filtersActive ? 'No patients match your search' : 'No patients yet'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {filtersActive
                ? 'Try a different term or clear the filters.'
                : canWrite
                  ? 'Add the first patient to get started.'
                  : 'Patients will appear here once a receptionist adds them.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {patients.length} of {pagination.total} · Page {pagination.page} of {pagination.totalPages}
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
        <PatientFormModal
          key={editing?._id || 'new'}
          patient={editing}
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
        title="Delete patient?"
        message={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.patientId}) will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete patient"
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

export default Patients;
