/** 
 * PatientsDashboard — Patient dashboard (Phase 20)
 * 
 * Role-specific dashboard showing patient-centric information:
 * - Upcoming appointments
 * - Own medical records summary
 * - Quick stats and profile access
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, User, Clock, ChevronLeft, ChevronRight, Eye, Search, Trash2, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 10;

const PatientsDashboard = () => {
  const { role, user } = useAuth();
  const canWrite = can(role, 'appointments:write');

  const [data, setData] = useState({
    appointments: [],
    loading: true,
    error: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('-appointmentDate');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
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

  // Fetch appointments for this patient
  useEffect(() => {
    const seq = ++seqRef.current;
    requestAppointments(params)
      .then((res) => {
        if (seq !== seqRef.current) return;
        setData({ appointments: res.data.data, loading: false });
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setData({ error: err.response?.data?.message || 'Could not load appointments.', loading: false });
      });
  }, [params]);

  const requestAppointments = (p) => api.get('/api/appointments', { params: p });

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const res = await requestAppointments(params);
      if (seq === seqRef.current) {
        setData({ appointments: res.data.data, loading: false });
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setData({ error: err.response?.data?.message || 'Could not load appointments.' });
      }
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const { appointments } = data;

  const initials = (name) =>
    name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mx-auto w-full max-w-7xl p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">My Dashboard</h1>
          <p className="text-sm text-emerald-700">
            Welcome, {user.name || user.patientId || ''}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {data.error && !data.loading && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{data.error}</span>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1 font-semibold underline hover:text-rose-900"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Upcoming appointments */}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-emerald-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {data.loading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="h-4 w-full rounded bg-emerald-100" />
                    </td>
                  </tr>
                ))
              }

              {!data.loading &&
                appointments.map((a) => (
                  <tr key={a._id} className="transition hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      {a.doctor ? (
                        <div className="flex items-center gap-3">
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
                      {formatDate(a.appointmentDate)} · {a.appointmentTime}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {a.department ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{a.department.name}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-1 text-xs font-bold ${
                        a.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                        : a.status === 'pending'
                          ? 'bg-emerald-200 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                      }">
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to `/appointments/${a._id}`
                          title="View appointment"
                          aria-label={`View appointment details`}
                          className="rounded-full p-2 text-emerald-600 transition:hover:bg-emerald-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!data.loading && !data.error && appointments.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <User className="h-6 w-6" />
            </span>
            <p className="font-semibold text-emerald-900">No appointments found</p>
            <p className="mt-1 text-sm text-gray-500">
              No appointments match your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6">
        <p className="text-xs text-gray-500">
          Upcoming appointments: {appointments.length}
        </p>
      </div>

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

export default PatientsDashboard;