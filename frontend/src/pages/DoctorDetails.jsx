/**
 * DoctorDetails — Single doctor profile (Phase 14)
 *
 * Fetched by ObjectId or doctorId (`/doctors/:id`, both accepted by the
 * Phase 13 API). Shows the professional profile: specialization, fee,
 * experience, qualification, weekly availability schedule, bio and the
 * linked account. Route is admin-only (RequireRole in App.jsx), so edit
 * and delete are always available here.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  GraduationCap,
  IndianRupee,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Trash2,
  UserRound,
} from 'lucide-react';
import api from '../services/api';
import { DAYS, formatInr } from '../utils/doctorOptions';
import { formatDate } from '../utils/formatDate';
import DoctorFormModal from '../components/DoctorFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

/** Pure request helper (no state) — safe to call from the effect. */
const requestDoctor = (id) => api.get(`/doctors/${id}`);

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const SectionCard = ({ title, children }) => (
  <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-700">{title}</h2>
    {children}
  </section>
);

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="break-words text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  </div>
);

const DoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
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
  const loading = !doctor && !error;

  // Fetch on mount / id change — chain inline with setState only in callbacks.
  useEffect(() => {
    let active = true;
    requestDoctor(id)
      .then((res) => {
        if (!active) return;
        setDoctor(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Could not load this doctor.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Handler-initiated refresh (retry buttons).
  const load = useCallback(async () => {
    try {
      const res = await requestDoctor(id);
      setDoctor(res.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this doctor.');
    }
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/doctors/${doctor.doctorId}`);
      navigate('/doctors');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the doctor.');
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-52 rounded-2xl bg-emerald-100" />
          <div className="h-52 rounded-2xl bg-emerald-100" />
        </div>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-gray-900">Doctor not found</h1>
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
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            to="/doctors"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to doctors
          </Link>
        </div>
      </div>
    );
  }

  // Availability sorted into weekday order, blanks → "not configured"
  const byDay = Object.fromEntries((doctor.availability || []).map((slot) => [slot.day, slot]));

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Breadcrumb */}
      <Link
        to="/doctors"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All doctors
      </Link>

      {/* Profile header */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {doctor.profileImage ? (
              <img
                src={doctor.profileImage}
                alt={doctor.name}
                className="h-16 w-16 shrink-0 rounded-full border border-emerald-100 object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                {initials(doctor.name)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-emerald-950">{doctor.name}</h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800">
                  {doctor.doctorId}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                <span className="font-medium text-emerald-700">{doctor.specialization}</span>
                {doctor.department && <span>· {doctor.department}</span>}
                {doctor.experience > 0 && <span>· {doctor.experience} years experience</span>}
                <span className="text-gray-400">· Joined {formatDate(doctor.createdAt)}</span>
              </p>
            </div>
          </div>

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
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Practice */}
        <SectionCard title="Practice">
          <DetailRow icon={IndianRupee} label="Consultation fee" value={formatInr(doctor.consultationFee)} />
          <DetailRow icon={CalendarClock} label="Experience" value={doctor.experience > 0 ? `${doctor.experience} years` : ''} />
          <DetailRow icon={GraduationCap} label="Qualification" value={doctor.qualification} />
          <DetailRow icon={UserRound} label="Linked account" value={doctor.user ? `${doctor.user.email} (${doctor.user.role})` : 'Not linked to a login'} />
        </SectionCard>

        {/* Contact */}
        <SectionCard title="Contact">
          <DetailRow icon={Mail} label="Email" value={doctor.email} />
          <DetailRow icon={Phone} label="Phone" value={doctor.phone} />
          {doctor.bio && (
            <div className="py-2">
              <p className="text-xs text-gray-400">Bio</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{doctor.bio}</p>
            </div>
          )}
        </SectionCard>

        {/* Weekly availability */}
        <div className="md:col-span-2">
          <SectionCard title="Weekly availability">
            {(doctor.availability || []).length > 0 ? (
              <ul className="divide-y divide-emerald-50">
                {DAYS.filter((day) => byDay[day]).map((day) => {
                  const slot = byDay[day];
                  return (
                    <li key={day} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      {/* Full day name — dayLabel()'s 3-letter form is for chips only */}
                      <span className="font-semibold text-emerald-900">
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </span>
                      <span className="text-gray-600">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          slot.isAvailable === false
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {slot.isAvailable === false ? 'Unavailable' : 'Available'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No availability configured yet.</p>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <DoctorFormModal
          key={doctor._id}
          doctor={doctor}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setDoctor(updated);
            setEditOpen(false);
            showToast('success', 'Changes saved');
          }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete doctor?"
        message={`${doctor.name} (${doctor.doctorId}) will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete doctor"
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

export default DoctorDetails;
