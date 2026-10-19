/**
 * DoctorFormModal — Add / Edit doctor form (Phase 14)
 *
 * One modal serves both flows (parents mount it conditionally + keyed):
 *   doctor = null  → POST /api/doctors   (create)
 *   doctor         → PUT  /api/doctors/:doctorId (update)
 *
 * Includes a small weekly-availability editor (day + time window rows).
 * Client-side validation mirrors the backend (Doctor.model.js /
 * doctor.controller.js); the server stays the authority — its error
 * message (409 duplicate email, 400 validation) shows in the banner.
 */

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../services/api';
import { DAYS, SPECIALIZATIONS } from '../utils/doctorOptions';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const EMPTY_FORM = {
  name: '',
  email: '',
  specialization: '',
  department: '',
  qualification: '',
  experience: '',
  phone: '',
  consultationFee: '',
  bio: '',
  profileImage: '',
  slots: [],
};

/** Map an existing doctor document → form fields (or the empty form). */
const toFormValues = (doctor) => {
  if (!doctor) return EMPTY_FORM;
  return {
    name: doctor.name || '',
    email: doctor.email || '',
    specialization: doctor.specialization || '',
    department: doctor.department || '',
    qualification: doctor.qualification || '',
    experience: doctor.experience === 0 || doctor.experience ? String(doctor.experience) : '',
    phone: doctor.phone || '',
    consultationFee:
      doctor.consultationFee === 0 || doctor.consultationFee ? String(doctor.consultationFee) : '',
    bio: doctor.bio || '',
    profileImage: doctor.profileImage || '',
    slots: Array.isArray(doctor.availability)
      ? doctor.availability.map((s) => ({
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable !== false,
        }))
      : [],
  };
};

/** Returns an error message or null — mirrors backend validateCreate(). */
const validate = (form) => {
  if (!form.name.trim() || form.name.trim().length < 2) return 'Name is required (min 2 characters)';
  if (!EMAIL_REGEX.test(form.email.trim())) return 'A valid email is required';
  if (!form.specialization) return 'Please select a specialization';

  const fee = Number(form.consultationFee);
  if (form.consultationFee === '' || Number.isNaN(fee) || fee < 0) {
    return 'Consultation fee is required and must be a number ≥ 0';
  }
  if (form.experience !== '') {
    const exp = Number(form.experience);
    if (Number.isNaN(exp) || exp < 0 || exp > 70) return 'Experience must be between 0 and 70 years';
  }
  if (form.phone && !PHONE_REGEX.test(form.phone)) return 'Please provide a valid phone number';

  const seen = new Set();
  for (const slot of form.slots) {
    if (!DAYS.includes(slot.day)) return 'Each availability row needs a day';
    if (seen.has(slot.day)) return `Duplicate availability day: ${slot.day}`;
    seen.add(slot.day);
    if (!TIME_REGEX.test(slot.startTime) || !TIME_REGEX.test(slot.endTime)) {
      return `Availability on ${slot.day}: start and end times are required`;
    }
    if (slot.endTime <= slot.startTime) {
      return `Availability on ${slot.day}: end time must be after start time`;
    }
  }
  return null;
};

const inputClass =
  'w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

const timeClass =
  'rounded-xl border border-emerald-200 bg-white px-2 py-1.5 text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-emerald-800">
      {label}
      {required && <span className="text-rose-500"> *</span>}
    </span>
    {children}
  </label>
);

const DoctorFormModal = ({ doctor, onClose, onSaved }) => {
  // Mount-fresh per open: parents render this conditionally with a `key`,
  // so the lazy initializer seeds the form once — no state-in-effect reset.
  const [form, setForm] = useState(() => toFormValues(doctor));
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

  const setSlot = (index, key, value) =>
    setForm((f) => ({
      ...f,
      slots: f.slots.map((slot, i) => (i === index ? { ...slot, [key]: value } : slot)),
    }));

  const addSlot = () =>
    setForm((f) => ({
      ...f,
      slots: [...f.slots, { day: '', startTime: '09:00', endTime: '13:00', isAvailable: true }],
    }));

  const removeSlot = (index) =>
    setForm((f) => ({ ...f, slots: f.slots.filter((_, i) => i !== index) }));

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
      specialization: form.specialization,
      department: form.department.trim(),
      qualification: form.qualification.trim(),
      experience: form.experience === '' ? 0 : Number(form.experience),
      phone: form.phone.trim(),
      consultationFee: Number(form.consultationFee),
      bio: form.bio.trim(),
      profileImage: form.profileImage.trim(),
      availability: form.slots.map((slot) => ({
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      })),
    };

    try {
      const res = doctor
        ? await api.put(`/doctors/${doctor.doctorId}`, payload)
        : await api.post('/doctors', payload);
      onSaved(res.data.data, doctor ? 'updated' : 'created');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the doctor — please try again.');
      setSaving(false);
    }
  };

  const usedDays = form.slots.map((slot) => slot.day);

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
        aria-label={doctor ? 'Edit doctor' : 'Add doctor'}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">
              {doctor ? 'Edit doctor' : 'Add doctor'}
            </h2>
            <p className="text-xs text-gray-500">
              {doctor ? `Updating ${doctor.doctorId}` : 'A doctor ID is generated automatically.'}
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
                placeholder="e.g. Dr. Neha Verma"
                autoFocus
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className={inputClass}
                placeholder="doctor@example.com"
              />
            </Field>
            <Field label="Specialization" required>
              <select value={form.specialization} onChange={set('specialization')} className={inputClass}>
                <option value="">Select specialization…</option>
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <input
                type="text"
                value={form.department}
                onChange={set('department')}
                className={inputClass}
                placeholder="e.g. Cardiology"
              />
            </Field>
            <Field label="Qualification">
              <input
                type="text"
                value={form.qualification}
                onChange={set('qualification')}
                className={inputClass}
                placeholder="MBBS, MD"
              />
            </Field>
            <Field label="Experience (years)">
              <input
                type="number"
                min="0"
                max="70"
                value={form.experience}
                onChange={set('experience')}
                className={inputClass}
                placeholder="0"
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
            <Field label="Consultation fee (₹)" required>
              <input
                type="number"
                min="0"
                step="1"
                value={form.consultationFee}
                onChange={set('consultationFee')}
                className={inputClass}
                placeholder="800"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Profile image URL">
                <input
                  type="text"
                  value={form.profileImage}
                  onChange={set('profileImage')}
                  className={inputClass}
                  placeholder="https://…"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Bio">
                <textarea
                  value={form.bio}
                  onChange={set('bio')}
                  rows={3}
                  className={inputClass}
                  placeholder="Short professional summary"
                />
              </Field>
            </div>

            {/* Weekly availability */}
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Weekly availability
                </p>
                <button
                  type="button"
                  onClick={addSlot}
                  disabled={form.slots.length >= DAYS.length}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add day
                </button>
              </div>

              {form.slots.length === 0 ? (
                <p className="text-sm text-gray-500">No working days configured yet.</p>
              ) : (
                <ul className="space-y-2">
                  {form.slots.map((slot, index) => (
                    <li
                      // Rows are only ever appended/removed (never reordered),
                      // so the index is a stable key here.
                      key={index}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-2"
                    >
                      <select
                        aria-label={`Day ${index + 1}`}
                        value={slot.day}
                        onChange={(e) => setSlot(index, 'day', e.target.value)}
                        className={`${timeClass} min-w-28`}
                      >
                        <option value="">Day…</option>
                        {DAYS.filter((d) => !usedDays.includes(d) || d === slot.day).map((d) => (
                          <option key={d} value={d}>
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`Start time ${index + 1}`}
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => setSlot(index, 'startTime', e.target.value)}
                        className={timeClass}
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        aria-label={`End time ${index + 1}`}
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => setSlot(index, 'endTime', e.target.value)}
                        className={timeClass}
                      />
                      <label className="inline-flex items-center gap-1 text-xs text-emerald-800">
                        <input
                          type="checkbox"
                          checked={slot.isAvailable}
                          onChange={(e) => setSlot(index, 'isAvailable', e.target.checked)}
                        />
                        Available
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove ${slot.day || 'day'} ${index + 1}`}
                        onClick={() => removeSlot(index)}
                        className="ml-auto rounded-full p-1.5 text-rose-600 transition hover:bg-rose-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
              {saving ? 'Saving…' : doctor ? 'Save changes' : 'Add doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorFormModal;
