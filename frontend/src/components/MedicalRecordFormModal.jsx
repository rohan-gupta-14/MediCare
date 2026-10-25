/** 
 * MedicalRecordFormModal — Add / Edit medical record form (Phase 18)
 * 
 * One modal serves both flows (parents mount it conditionally + keyed):
 *   record = null  → POST /api/medical-records   (create)
 *   record         → PUT  /api/medical-records/:recordId (update)
 * 
 * Client-side validation mirrors the backend rules (MedicalRecord.model.js)
 * so users get instant feedback; the server stays the authority — its error
 * message (409 duplicate title, 400 validation) is shown in the banner when it
 * rejects the request.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { X, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

const inputClass =
  'w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

const EMPTY_FORM = {
  patient: '',
  doctor: '',
  department: '',
  admission: '',
  title: '',
  description: '',
  chiefComplaint: '',
  diagnosis: '',
  prescriptionSummary: '',
  notes: '',
  status: 'active',
  vitalsTemperature: '',
  vitalsBloodPressureSystolic: '',
  vitalsBloodPressureDiastolic: '',
  vitalsHeartRate: '',
  vitalsRespiratoryRate: '',
  vitalsOxygenSaturation: '',
  heightValue: '',
  heightUnit: 'cm',
  weightValue: '',
  weightUnit: 'kg',
  allergies: [],
  medications: [],
};

const MedicalRecordFormModal = ({ record, onClose, onSaved }) => {
  // Mount-fresh per open: parents render this conditionally with a `key`,
  // so the lazy initializer seeds the form once — no state-in-effect reset.
  const [form, setForm] = useState(() => toFormValues(record));
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

  // Parse form values back to the shape expected by the API
  const getApiPayload = () => {
    const f = form;
    const payload = {
      patient: f.patient,
      doctor: f.doctor,
      department: f.department || null,
      admission: f.admission || null,
      title: f.title || '',
      description: f.description || '',
      chiefComplaint: f.chiefComplaint || '',
      diagnosis: f.diagnosis || '',
      prescriptionSummary: f.prescriptionSummary || '',
      notes: f.notes || '',
      status: f.status || 'active',
      vitalsTemperature: f.vitalsTemperature !== undefined ? Number(f.vitalsTemperature) : undefined,
      vitalsBloodPressureSystolic: f.vitalsBloodPressureSystolic !== undefined ? Number(f.vitalsBloodPressureSystolic) : undefined,
      vitalsBloodPressureDiastolic: f.vitalsBloodPressureDiastolic !== undefined ? Number(f.vitalsBloodPressureDiastolic) : undefined,
      vitalsHeartRate: f.vitalsHeartRate !== undefined ? Number(f.vitalsHeartRate) : undefined,
      vitalsRespiratoryRate: f.vitalsRespiratoryRate !== undefined ? Number(f.vitalsRespiratoryRate) : undefined,
      vitalsOxygenSaturation: f.vitalsOxygenSaturation !== undefined ? Number(f.vitalsOxygenSaturation) : undefined,
      heightValue: f.heightValue !== undefined ? Number(f.heightValue) : undefined,
      heightUnit: f.heightUnit || 'cm',
      weightValue: f.weightValue !== undefined ? Number(f.weightValue) : undefined,
      weightUnit: f.weightUnit || 'kg',
      allergies: Array.isArray(f.allergies) ? f.allergies : (f.allergies ? f.allergies.split(',').map(s => s.trim()).filter(Boolean) : []),
      medications: Array.isArray(f.medications) ? f.medications : (f.medications ? f.medications.split(',').map(s => s.trim()).filter(Boolean) : []),
    };
    // Remove undefined values
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation (mirrors backend)
    if (!form.patient) {
      setError('Patient is required');
      return;
    }
    if (!form.doctor) {
      setError('Doctor is required');
      return;
    }
    if (form.vitalsTemperature !== undefined && (form.vitalsTemperature < 30 || form.vitalsTemperature > 45)) {
      setError('Temperature must be between 30°C and 45°C');
      return;
    }
    if (form.heightValue !== undefined && form.heightValue < 50) {
      setError('Height must be at least 50cm');
      return;
    }
    if (form.weightValue !== undefined && form.weightValue < 10) {
      setError('Weight must be at least 10kg');
      return;
    }

    setError('');
    setSaving(true);

    const payload = getApiPayload();

    try {
      const res = record
        ? await api.put(`/medical-records/${record._id}`, payload)
        : await api.post('/medical-records', payload);
      onSaved(res.data.data, record ? 'updated' : 'created');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the medical record — please try again.');
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
        aria-label={record ? 'Edit medical record' : 'Add medical record'}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">
              {record ? 'Edit medical record' : 'Add medical record'}
            </h2>
            <p className="text-xs text-gray-500">
              {record ? `Updating record for ${record.patient.name}` : 'A new record ID will be generated automatically.'}
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
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Department
              </label>
              <select
                value={form.department}
                onChange={set('department')}
                className={inputClass}
              >
                <option value="">Select department…</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Title
              </label>
              <input
                value={form.title}
                onChange={set('title')}
                className={inputClass}
                placeholder="e.g. Initial consultation"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={2}
                className={inputClass}
                placeholder="Clinical description"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Chief Complaint
              </label>
              <textarea
                value={form.chiefComplaint}
                onChange={set('chiefComplaint')}
                rows={2}
                className={inputClass}
                placeholder="e.g. Fever, cough, pain"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Diagnosis
              </label>
              <textarea
                value={form.diagnosis}
                onChange={set('diagnosis')}
                rows={2}
                className={inputClass}
                placeholder="e.g. Upper respiratory infection"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Prescription Summary
              </label>
              <textarea
                value={form.prescriptionSummary}
                onChange={set('prescriptionSummary')}
                rows={2}
                className={inputClass}
                placeholder="Current medications"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                className={inputClass}
                placeholder="Additional notes"
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
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Temperature (°C)
              </label>
              <input
                value={form.vitalsTemperature !== undefined ? form.vitalsTemperature : ''}
                onChange={set('vitalsTemperature')}
                type="number"
                className={inputClass}
                placeholder="36.8"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Blood Pressure (systolic/diastolic)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.vitalsBloodPressureSystolic !== undefined ? form.vitalsBloodPressureSystolic : ''}
                  onChange={set('vitalsBloodPressureSystolic')}
                  type="number"
                  className={inputClass}
                  placeholder="Systolic"
                />
                <input
                  value={form.vitalsBloodPressureDiastolic !== undefined ? form.vitalsBloodPressureDiastolic : ''}
                  onChange={set('vitalsBloodPressureDiastolic')}
                  type="number"
                  className={inputClass}
                  placeholder="Diastolic"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Heart Rate (bpm)
              </label>
              <input
                value={form.vitalsHeartRate !== undefined ? form.vitalsHeartRate : ''}
                onChange={set('vitalsHeartRate')}
                type="number"
                className={inputClass}
                placeholder="80"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Respiratory Rate (breaths/min)
              </label>
              <input
                value={form.vitalsRespiratoryRate !== undefined ? form.vitalsRespiratoryRate : ''}
                onChange={set('vitalsRespiratoryRate')}
                type="number"
                className={inputClass}
                placeholder="16"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Oxygen Saturation (%)
              </label>
              <input
                value={form.vitalsOxygenSaturation !== undefined ? form.vitalsOxygenSaturation : ''}
                onChange={set('vitalsOxygenSaturation')}
                type="number"
                className={inputClass}
                placeholder="98"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Height (cm)
              </label>
              <input
                value={form.heightValue !== undefined ? form.heightValue : ''}
                onChange={set('heightValue')}
                type="number"
                className={inputClass}
                placeholder="170"
              />
              <select
                value={form.heightUnit}
                onChange={set('heightUnit')}
                className={inputClass}
              >
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="in">in</option>
                <option value="ft">ft</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Weight (kg)
              </label>
              <input
                value={form.weightValue !== undefined ? form.weightValue : ''}
                onChange={set('weightValue')}
                type="number"
                className={inputClass}
                placeholder="70"
              />
              <select
                value={form.weightUnit}
                onChange={set('weightUnit')}
                className={inputClass}
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
                <option value="st">st</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Allergies (comma separated)
              </label>
              <input
                value={form.allergies.join ? form.allergies.join(', ') : form.allergies || ''}
                onChange={set('allergies')}
                type="text"
                className={inputClass}
                placeholder="Penicillin, dust mite"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Medications
              </label>
              <input
                value={form.medications.join ? form.medications.join(', ') : form.medications || ''}
                onChange={set('medications')}
                type="text"
                className={inputClass}
                placeholder="Amoxicillin 500mg twice daily"
              />
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
              {saving ? 'Saving…' : record ? 'Save changes' : 'Add record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MedicalRecordFormModal;