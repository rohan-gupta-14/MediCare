/** 
 * DoctorsDashboard — Doctor dashboard (Phase 19)
 * 
 * Role-specific dashboard showing doctor-centric information using existing APIs:
 * - Upcoming appointments (via /api/appointments)
 * - Patient load (via /api/patients with doctor filter)
 * - Quick stats from existing data
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Stethoscope, Users, Clock, ChevronLeft, ChevronRight, Eye, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 10;

const DoctorsDashboard = () => {
  const { role } = useAuth();
  const { from } = useParams();
  const canWrite = can(role, 'appointments:write');

  const [data, setData] = useState({
    appointments: [],
    patients: [],
    todayArrivals: 0,
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

  // Fetch appointments for this doctor
  useEffect(() => {
    const seq = ++seqRef.current;
    requestAppointments(params)
      .then((res) => {
        if (seq !== seqRef.current) return;
        setData((d) => ({ ...d, appointments: res.data.data }));
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setData((d) => ({ ...d, error: err.response?.data?.message || 'Could not load appointments.' }));
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  // Fetch patients for this doctor
  useEffect(() => {
    const seq = ++seqRef.current;
    requestPatients(params)
      .then((res) => {
        if (seq !== seqRef.current) return;
        setData((d) => ({ ...d, patients: res.data.data }));
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setData((d) => ({ ...d, error: err.response?.data?.message || 'Could not load patients.' }));
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [params]);

  const requestAppointments = (p) => api.get('/api/appointments', { params: p });
  const requestPatients = (p) => api.get('/api/patients', { params: p });

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const [apptRes, patientRes] = await Promise.all([
        requestAppointments(params),
        requestPatients(params),
      ]);
      if (seq === seqRef.current) {
        setData({
          appointments: apptRes.data.data,
          patients: patientRes.data.data,
          todayArrivals: apptRes.data.data.filter((a) => 
            new Date(a.appointmentDate).toDateString() === new Date().toDateString()
          ).length,
          loading: false,
          error: '',
        });
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setData((d) => ({ ...d, error: err.response?.data?.message || 'Could not load dashboard data.' }));
      }
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const { appointments, patients, todayArrivals } = data;

  const initials = (name) =>
    name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Doctor Dashboard</h1>
          <p className="text-sm text-emerald-700">
            Welcome back, Dr. {from ? from.replace(/_/g, ' ') : ''}
          </p>
        </div>
        <div className="sm:w-full sm:flex sm:items-center sm:justify-between">
          <div className="sm:w-1/4 mb-3 sm:mb-0 sm:mr-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <div className="text-3xl font-bold text-emerald-800">{patients.length}</div>
              <div className="text-xs text-emerald-600">Total Patients</div>
            </div>
          </div>
          <div className="sm:w-1/4 mb-3 sm:mb-0 sm:mr-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <div className="text-3xl font-bold text-emerald-800">{todayArrivals}</div>
              <div className="text-xs text-emerald-600">Today's Arrivals</div>
            </div>
          </div>
          <div className="sm:w-1/4 mb-3 sm:mb-0 sm:mr-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <div className="text-3xl font-bold text-emerald-800">{appointments.length}</div>
              <div className="text-xs text-emerald-600">Upcoming Appointments</div>
            </div>
          </div>
          <div className="sm:w-1/4 mb-3 sm:mb-0">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <div className="text-3xl font-bold text-emerald-800">—</div>
              <div className="text-xs text-emerald-600">Availability</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {!data.loading && data.error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{data.error}</span>
          <button
            type="button"
            onClick={() => setData((d) => ({ ...d, error: '' }))}
            className="inline-flex items-center gap-1 font-semibold underline hover:text-rose-900"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Appointments table */}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs uppercase tracking-wider text-emerald-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Patient ID</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
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
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {initials(a.patient.name)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            to `/patients/${a.patient._id}`
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
                      {formatDate(a.appointmentDate)} · {a.appointmentTime}
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
                          aria-label={`View appointment for ${a.patient.name}`}
                          className="rounded-full p-2 text-emerald-600 transition:hover:bg-emerald-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              title="Edit appointment"
                              aria-label={`Edit appointment for ${a.patient.name}`}
                              className="rounded-full p-2 text-indigo-600 transition:hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
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

        {!data.loading && !data.error && appointments.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-semibold text-emerald-900">No appointments found</p>
            <p className="mt-1 text-sm text-gray-500">
              No appointments match your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Patient summary */}
      <div className="mt-6">
        <p className="text-xs text-gray-500">
          Total patients: {patients.length}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Today's arrivals: {todayArrivals}
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

export default DoctorsDashboard;