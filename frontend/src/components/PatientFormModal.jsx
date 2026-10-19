/**
 * PatientFormModal — Add / Edit patient form (Phase 12)
 *
 * One modal serves both flows (parents mount it conditionally + keyed):
 *   patient = null  → POST /api/patients   (create)
 *   patient         → PUT  /api/patients/:patientId (update)
 *
 * Client-side validation mirrors the backend rules (Patient.model.js /
 * patient.controller.js) so users get instant feedback; the server stays
 * the authority — its error message (409 duplicate email, 400 validation)
 * is shown in the banner when it rejects the request.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  bloodGroup: '',
  address: '',
  emName: '',
  emPhone: '',
  emRelationship: '',
  allergies: '',
};

/** Map an existing patient document → form fields (or the empty form). */
const toFormValues = (patient) => {
  if (!patient) return EMPTY_FORM;
  return {
    name: patient.name || '',
    email: patient.email || '',
    phone: patient.phone || '',
    gender: patient.gender || '',
    dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : '',
    bloodGroup: patient.bloodGroup || '',
    address: patient.address || '',
    emName: patient.emergencyContact?.name || '',
    emPhone: patient.emergencyContact?.phone || '',
    emRelationship: patient.emergencyContact?.relationship || '',
    allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '',
  };
};

/** Returns an error message or null — mirrors backend validateCreate(). */
const validate = (form) => {
  if (!form.name.trim() || form.name.trim().length < 2) return 'Name is required (min 2 characters)';
  if (!EMAIL_REGEX.test(form.email.trim())) return 'A valid email is required';
  if (!form.gender) return 'Please select a gender';
  if (form.phone && !PHONE_REGEX.test(form.phone)) return 'Please provide a valid phone number';
  if (form.emPhone && !PHONE_REGEX.test(form.emPhone)) return 'Emergency contact phone is invalid';
  if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) {
    return 'Date of birth cannot be in the future';
  }
  return null;
};

const inputClass =
  'w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-emerald-800">
      {label}
      {required && <span className="text-rose-500"> *</span>}
    </span>
    {children}
  </label>
);

const PatientFormModal = ({ patient, onClose, onSaved }) => {
  // Mount-fresh per open: parents render this conditionally with a `key`,
  // so the lazy initializer seeds the form once — no state-in-effect reset.
  const [form, setForm] = useState(() => toFormValues(patient));
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
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || null,
      bloodGroup: form.bloodGroup,
      address: form.address.trim(),
      emergencyContact: {
        name: form.emName.trim(),
        phone: form.emPhone.trim(),
        relationship: form.emRelationship.trim(),
      },
      allergies: form.allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    };

    try {
      const res = patient
        ? await api.put(`/patients/${patient.patientId}`, payload)
        : await api.post('/patients', payload);
      onSaved(res.data.data, patient ? 'updated' : 'created');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the patient — please try again.');
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
        aria-label={patient ? 'Edit patient' : 'Add patient'}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">
              {patient ? 'Edit patient' : 'Add patient'}
            </h2>
            <p className="text-xs text-gray-500">
              {patient ? `Updating ${patient.patientId}` : 'A patient ID is generated automatically.'}
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
            <Field label="Full name" required>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className={inputClass}
                placeholder="e.g. Alice Sharma"
                autoFocus
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className={inputClass}
                placeholder="alice@example.com"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                className={inputClass}
                placeholder="555-010-2030"
              />
            </Field>
            <Field label="Gender" required>
              <select value={form.gender} onChange={set('gender')} className={inputClass}>
                <option value="">Select gender…</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={inputClass} />
            </Field>
            <Field label="Blood group">
              <select value={form.bloodGroup} onChange={set('bloodGroup')} className={inputClass}>
                <option value="">Unknown</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea
                  value={form.address}
                  onChange={set('address')}
                  rows={2}
                  className={inputClass}
                  placeholder="Street, city, state"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Emergency contact
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Name">
                  <input type="text" value={form.emName} onChange={set('emName')} className={inputClass} />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={form.emPhone} onChange={set('emPhone')} className={inputClass} />
                </Field>
                <Field label="Relationship">
                  <input
                    type="text"
                    value={form.emRelationship}
                    onChange={set('emRelationship')}
                    className={inputClass}
                    placeholder="spouse"
                  />
                </Field>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Field label="Allergies">
                <input
                  type="text"
                  value={form.allergies}
                  onChange={set('allergies')}
                  className={inputClass}
                  placeholder="Penicillin, dust (comma separated)"
                />
              </Field>
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
              {saving ? 'Saving…' : patient ? 'Save changes' : 'Add patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;
