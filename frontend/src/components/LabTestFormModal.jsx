/** 
 * LabTestFormModal — Add / Edit lab test form (Phase 22)
 * 
 * One modal serves both flows (parents mount it conditionally + keyed):
 *   labTest = null  → POST /api/lab-tests   (create)
 *   labTest         → PUT  /api/lab-tests/:labTestId (update)
 * 
 * Client-side validation mirrors the backend rules (LabTest.model.js)
 * so users get instant feedback; the server stays the authority — its error
 * message (409 duplicate test name, 400 validation) is shown in the banner when it
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
  testType: '',
  testName: '',
  orderedDate: new Date().toISOString().split('T')[0],
  status: 'pending',
  results: '',
  referenceRange: '',
  unit: '',
  resultValue: '',
  notes: '',
};

const LabTestFormModal = ({ labTest, onClose, onSaved }) => {
  // Mount-fresh per open: parents render this conditionally with a `key`,
  // so the lazy initializer seeds the form once — no state-in-effect reset.
  const [form, setForm] = useState(() => toFormValues(labTest));
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

  const toFormValues = (labTest) => {
    if (!labTest) return { ...EMPTY_FORM };

    const orderedDate = labTest.orderedDate
      ? new LabTest(labTest).orderedDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return {
      patient: labTest.patient ? labTest.patient._id || '' : '',
      doctor: labTest.doctor ? labTest.doctor._id || '' : '',
      department: labTest.department ? labTest.department._id || '' : '',
      testType: labTest.testType || '',
      testName: labTest.testName || '',
      orderedDate,
      status: labTest.status || 'pending',
      results: labTest.results || '',
      referenceRange: labTest.referenceRange || '',
      unit: labTest.unit || '',
      resultValue: labTest.resultValue || '',
      notes: labTest.notes || '',
    };
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
    if (form.orderedDate && new Date(form.orderedDate) < new Date()) {
      setError('Ordered date cannot be in the past');
      return;
    }

    setError('');
    setSaving(true);

    const payload = {
      patient: form.patient,
      doctor: form.doctor,
      department: form.department || null,
      testType: form.testType,
      testName: form.testName,
      orderedDate: new Date(form.orderedDate),
      status: form.status,
      results: form.results,
      referenceRange: form.referenceRange,
      unit: form.unit,
      resultValue: form.resultValue,
      notes: form.notes,
    };

    try {
      const res = labTest
        ? await api.put(`/lab-tests/${labTest._id}`, payload)
        : await api.post('/lab-tests', payload);
      onSaved(res.data.data, labTest ? 'updated' : 'created');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the lab test — please try again.');
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
        aria-label={labTest ? 'Edit lab test' : 'Add lab test'}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">
              {labTest ? 'Edit lab test' : 'Add lab test'}
            </h2>
            <p className="text-xs text-gray-500">
              {labTest ? `Updating lab test for ${labTest.patient.name}` : 'A new lab test ID will be generated automatically.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 transition:hover:bg-emerald-50:hover:text-emerald-700"
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
                Test Type
              </label>
              <input
                value={form.testType}
                onChange={set('testType')}
                className={inputClass}
                placeholder="e.g. Blood test, X-ray, MRI"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Test Name
              </label>
              <input
                value={form.testName}
                onChange={set('testName')}
                className={inputClass}
                placeholder="e.g. Complete Blood Count, Chest X-ray"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Ordered Date
              </label>
              <input
                value={form.orderedDate}
                onChange={set('orderedDate')}
                type="date"
                className={inputClass}
              />
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
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Results
              </label>
              <textarea
                value={form.results}
                onChange={set('results')}
                rows={2}
                className={inputClass}
                placeholder="Test results"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Reference Range
              </label>
              <textarea
                value={form.referenceRange}
                onChange={set('referenceRange')}
                rows={2}
                className={inputClass}
                placeholder="e.g. 4.5-11.0 x10^12/L"
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Unit
              </label>
              <input
                value={form.unit}
                onChange={set('unit')}
                className={inputClass}
                placeholder="e.g. x10^9/L"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Result Value
              </label>
              <input
                value={form.resultValue}
                onChange={set('resultValue')}
                className={inputClass}
                placeholder="e.g. 7.8"
              />
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
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-800 transition:hover:bg-emerald-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition:hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : labTest ? 'Save changes' : 'Add lab test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LabTestFormModal;