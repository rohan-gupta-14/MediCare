/** 
 * AdmissionFormModal — Add / Edit admission form (Phase 17)
 * 
 * One modal serves both flows (parents mount it conditionally + keyed):
 *   admission = null  → POST /api/admissions   (create)
 *   admission         → PUT  /api/admissions/:admissionId (update)
 * 
 * Client-side validation mirrors the backend rules (Admission.model.js)
 * so users get instant feedback; the server stays the authority — its error
 * message (409 duplicate, 400 validation) is shown in the banner when it
 * rejects the request.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { X, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

const inputClass =
  'w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

const EMPTY_FORM = {
  patient: '',
  doctor: '',
  department: '',
  admissionDate: new Date().toISOString().split('T')[0],
  dischargeDate: '',
  reason: '',
  status: 'pending',
  roomNumber: '',
  bedNumber: '',
  notes: '',
};

/** Map an existing admission document → form fields (or the empty form). */
const toFormValues = (admission) => {
  if (!admission) return { ...EMPTY_FORM };

  const admissionDate = admission.admissionDate
    ? new Date(admission.admissionDate).toISOString().split('T')[0]
    : '';

  const dischargeDate = admission.dischargeDate
    ? new Date(admission.dischargeDate).toISOString().split('T')[0]
    : '';

  return {
    patient: admission.patient ? admission.patient._id || '' : '',
    doctor: admission.doctor ? admission.doctor._id || '' : '',
    department: admission.department ? admission.department._id || '' : '',
    admissionDate,
    dischargeDate,
    reason: admission.reason || '',
    status: admission.status || 'pending',
    roomNumber: admission.roomNumber || '',
    bedNumber: admission.bedNumber || '',
    notes: admission.notes || '',
  };
};

/** Validate form fields — mirrors backend validation rules. */
const validate = (form) => {
  if (!form.patient) return 'Patient is required';
  if (!form.doctor) return 'Doctor is required';
  if (form.admissionDate && new Date(form.admissionDate) < new Date()) {
    return 'Admission date cannot be in the past';
  }
  if (form.dischargeDate && form.admissionDate) {
    if (new Date(form.dischargeDate) < new Date(form.admissionDate)) {
      return 'Discharge date must be after admission date';
    }
  }
  if (form.status && !['pending', 'admitted', 'discharged', 'transferred', 'expired'].includes(form.status)) {
    return 'Status must be one of: pending, admitted, discharged, transferred, expired';
  }
  return null;
};

const AdmissionFormModal = ({ admission, onClose, onSaved }) => {
  // Mount-fresh per open: parents render this conditionally with a `key`,
  // so the lazy initializer seeds the form once — no state-in-effect reset.
  const [form, setForm] = useState(() => toFormValues(admission));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      patient: form.patient,
      doctor: form.doctor,
      department: form.department || null,
      admissionDate: new Date(form.admissionDate),
      ...(form.dischargeDate && { dischargeDate: new Date(form.dischargeDate) }),
      reason: form.reason,
      status: form.status,
      roomNumber: form.roomNumber,
      bedNumber: form.bedNumber,
      notes: form.notes,
    };

    try {
      const res = admission
        ? await api.put(`/admissions/${admission._id}`, payload)
        : await api.post('/admissions', payload);
      onSaved(res.data.data, admission ? 'updated' : 'created');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the admission — please try again.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={admission ? 'Edit admission' : 'Add admission'}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">
              {admission ? 'Edit admission' : 'Add admission'}
            </h2>
            <p className="text-xs text-gray-500">
              {admission ? `Updating admission for ${admission.patient.name}` : 'An admission ID will be generated automatically.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Patient
              </label>
              <select
                value={form.patient}
                onChange={set('patient')}
                className={inputClass}
              >
                <option value="">Select patient…</option>
                {/* Options would be populated dynamically or via a patient search */}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Doctor
              </label>
              <select
                value={form.doctor}
                onChange={set('doctor')}
                className={inputClass}
              >
                <option value="">Select doctor…</option>
                {/* Options would be populated dynamically or via a doctor search */}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Department
              </label>
              <select
                value={form.department}
                onChange={set('department')}
                className={inputClass}
              >
                <option value="">Select department…</option>
                {/* Options would be populated dynamically or via department search */}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Admission Date
              </label>
              <input
                type="date"
                value={form.admissionDate}
                onChange={set('admissionDate')}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Discharge Date
              </label>
              <input
                type="date"
                value={form.dischargeDate}
                onChange={set('dischargeDate')}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Reason
              </label>
              <textarea
                value={form.reason}
                onChange={set('reason')}
                rows={3}
                className={inputClass}
                placeholder="Reason for admission"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={set('status')}
                className={inputClass}
              >
                <option value="pending">Pending</option>
                <option value="admitted">Admitted</option>
                <option value="discharged">Discharged</option>
                <option value="transferred">Transferred</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Room Number
              </label>
              <input
                type="text"
                value={form.roomNumber}
                onChange={set('roomNumber')}
                className={inputClass}
                placeholder="Room number"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Bed Number
              </label>
              <input
                type="text"
                value={form.bedNumber}
                onChange={set('bedNumber')}
                className={inputClass}
                placeholder="Bed number"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                className={inputClass}
                placeholder="Additional notes"
              ></textarea>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : admission ? 'Save changes' : 'Add admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdmissionFormModal;