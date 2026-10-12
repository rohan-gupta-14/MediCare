/**
 * StatCard — Reusable dashboard metric card (Phase 10)
 *
 * Icon chip + big value + label + optional hint. Tone controls the
 * icon-chip tint so the card row stays on the emerald theme while
 * still differentiating metrics.
 */

const TONES = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  violet: 'bg-violet-100 text-violet-600',
  teal: 'bg-teal-100 text-teal-600',
};

const StatCard = ({ icon: Icon, label, value, hint, tone = 'emerald' }) => (
  <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-gray-400">{hint}</p>}
      </div>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          TONES[tone] || TONES.emerald
        }`}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
      </span>
    </div>
  </div>
);

export default StatCard;
