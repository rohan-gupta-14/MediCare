/**
 * PatientDetails — Single patient profile (Phase 12)
 *
 * Fetched by ObjectId or patientId (`/patients/:id`, both accepted by the
 * Phase 11 API). Shows demographics, emergency contact, allergies, medical
 * history and the linked account. Staff with `patients:write` can edit
 * (PatientFormModal) or delete (ConfirmDialog) from here.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Droplet,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { can } from '../utils/permissions';
import api from '../services/api';
import { formatDate, getAge } from '../utils/formatDate';
import PatientFormModal from '../components/PatientFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

/** Pure request helper (no state) — safe to call from the effect. */
const requestPatient = (id) => api.get(`/patients/${id}`);

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

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canWrite = can(role, 'patients:write');

  const [patient, setPatient] = useState(null);
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
  const loading = !patient && !error;

  // Fetch on mount / id change — chain inline with setState only in callbacks.
  useEffect(() => {
    let active = true;
    requestPatient(id)
      .then((res) => {
        if (!active) return;
        setPatient(res.data.data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Could not load this patient.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Handler-initiated refresh (retry buttons).
  const load = useCallback(async () => {
    try {
      const res = await requestPatient(id);
      setPatient(res.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this patient.');
    }
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/patients/${patient.patientId}`);
      navigate('/patients');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the patient.');
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

  if (error && !patient) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-gray-900">Patient not found</h1>
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
            to="/patients"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to patients
          </Link>
        </div>
      </div>
    );
  }

  const age = getAge(patient.dateOfBirth);
  const history = patient.medicalHistory || [];
  const allergies = patient.allergies || [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Breadcrumb */}
      <Link
        to="/patients"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All patients
      </Link>

      {/* Profile header */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
              {initials(patient.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-emerald-950">{patient.name}</h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-800">
                  {patient.patientId}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                <span className="capitalize">{patient.gender}</span>
                {age !== null && <span>· {age} years</span>}
                {patient.bloodGroup && (
                  <span className="inline-flex items-center gap-1">
                    · <Droplet className="h-3.5 w-3.5 text-rose-500" />
                    <span className="font-semibold text-rose-600">{patient.bloodGroup}</span>
                  </span>
                )}
                <span className="text-gray-400">· Registered {formatDate(patient.createdAt)}</span>
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Personal + contact */}
        <SectionCard title="Personal details">
          <DetailRow icon={CalendarDays} label="Date of birth" value={patient.dateOfBirth ? `${formatDate(patient.dateOfBirth)}${age !== null ? ` (${age} years)` : ''}` : ''} />
          <DetailRow icon={UserRound} label="Gender" value={patient.gender} />
          <DetailRow icon={Droplet} label="Blood group" value={patient.bloodGroup} />
          <DetailRow icon={Mail} label="Email" value={patient.email} />
          <DetailRow icon={Phone} label="Phone" value={patient.phone} />
          <DetailRow icon={MapPin} label="Address" value={patient.address} />
        </SectionCard>

        {/* Emergency contact + linked account */}
        <div className="space-y-6">
          <SectionCard title="Emergency contact">
            {patient.emergencyContact?.name ? (
              <>
                <DetailRow icon={UserRound} label="Name" value={patient.emergencyContact.name} />
                <DetailRow icon={Phone} label="Phone" value={patient.emergencyContact.phone} />
                <DetailRow label="Relationship" value={patient.emergencyContact.relationship} />
              </>
            ) : (
              <p className="text-sm text-gray-500">No emergency contact on file.</p>
            )}
          </SectionCard>

          <SectionCard title="Linked account">
            {patient.user ? (
              <>
                <DetailRow icon={Mail} label="Login email" value={patient.user.email} />
                <DetailRow label="Role" value={patient.user.role} />
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Not linked to a login — walk-in record maintained by staff.
              </p>
            )}
          </SectionCard>
        </div>

        {/* Allergies */}
        <SectionCard title={`Allergies (${allergies.length})`}>
          {allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No allergies recorded.</p>
          )}
        </SectionCard>

        {/* Medical history */}
        <SectionCard title={`Medical history (${history.length})`}>
          {history.length > 0 ? (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li key={`${entry._id || entry.condition}-${entry.diagnosedAt || ''}`} className="rounded-xl border border-emerald-50 bg-emerald-50/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-900">{entry.condition}</p>
                    {entry.diagnosedAt && (
                      <span className="text-xs text-gray-500">{formatDate(entry.diagnosedAt)}</span>
                    )}
                  </div>
                  {entry.notes && <p className="mt-1 text-sm text-gray-600">{entry.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No medical history recorded.</p>
          )}
        </SectionCard>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <PatientFormModal
          key={patient._id}
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setPatient(updated);
            setEditOpen(false);
            showToast('success', 'Changes saved');
          }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete patient?"
        message={`${patient.name} (${patient.patientId}) will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete patient"
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

export default PatientDetails;
