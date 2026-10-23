/**
 * DepartmentFormModal — Add / Edit department form (Phase 15)
 *
 * One modal serves both flows (parents mount it conditionally + keyed):
 *   department = null  → POST /api/departments   (create)
 *   department         → PUT  /api/departments/:id (update)
 *
 * Client-side validation mirrors the backend rules (Department.model.js /
 * department.controller.js); the server stays the authority — its error
 * message (409 duplicate name, 400 validation) is shown in the banner.
 *
 * The head-doctor select loads the doctor list (GET /api/doctors) once on
 * mount so admins pick from real profiles instead of pasting ids.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import { DEPARTMENT_STATUSES } from '../utils/departmentOptions';

const EMPTY_FORM = {
  name: '',
  status: 'active',
  location: '',
  headDoctor: '',
  description: '',
};

/** Map an existing department document → form fields (or the empty form). */
const toFormValues = (department) => {
  if (!department) return EMPTY_FORM;
  return {
    name: department.name || '',
    status: department.status || 'active',
    location: department.location || '',
    headDoctor: department.headDoctor?._id || '',
    description: department.description || '',
  };
};

/** Returns an error message or null — mirrors backend validateFields(). */
const validate = (form) => {
  if (!form.name.trim() || form.name.trim().length < 2) {
    return 'Department name is required (min 2 characters)';
  }
  if (form.name.trim().length > 100) return 'Department name cannot exceed 100 characters';
  if (form.location.trim().length > 200) return 'Location cannot exceed 200 characters';
  if (form.description.trim().length > 1000) return 'Description cannot exceed 1000 characters';
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

const DepartmentFormModal = ({ department, onClose, onSaved }) => {
  // Mount-fresh per open: parents render this conditionally with a `key`,
  // so the lazy initializer seeds the form once — no state-in-effect reset.
  const [form, setForm] = useState(() => toFormValues(department));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Doctor options for the head-doctor select (loaded once per mount).
  const [doctors, setDoctors] = useState([]);
  const [doctorsError, setDoctorsError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get('/doctors', { params: { limit: 100, sort: 'name' } })
      .then((res) => {
        if (active) setDoctors(res.data.data.doctors || []);
      })
      .catch((err) => {
        if (active) setDoctorsError(err.response?.data?.message || 'Could not load doctors.');
      });
    return () => {
      active = false;
    };
  }, []);

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
      status: form.status,
      location: form.location.trim(),
      headDoctor: form.headDoctor || null,
      description: form.description.trim(),
    };

    try {
      const res = department
        ? await api.put(`/departments/${department._id}`, payload)
        : await api.post('/departments', payload);
      onSaved(res.data.data, department ? 'updated' : 'created');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the department.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={department ? 'Edit department' : 'Add department'}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-emerald-950">
            {department ? 'Edit department' : 'Add department'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-emerald-600 transition hover:bg-emerald-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Department name" required>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Cardiology"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status" required>
              <select value={form.status} onChange={set('status')} className={inputClass}>
                {DEPARTMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Location">
              <input
                type="text"
                value={form.location}
                onChange={set('location')}
                placeholder="e.g. Block A, Floor 2"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Head doctor">
            <select value={form.headDoctor} onChange={set('headDoctor')} className={inputClass}>
              <option value="">No head doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.doctorId}) — {d.specialization}
                </option>
              ))}
            </select>
            {doctorsError && <span className="mt-1 block text-xs text-rose-600">{doctorsError}</span>}
            <span className="mt-1 block text-xs text-gray-400">
              A doctor may head at most one department.
            </span>
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="What this department covers…"
              className={inputClass}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
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
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : department ? 'Save changes' : 'Add department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentFormModal;
