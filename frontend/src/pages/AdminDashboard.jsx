/**
 * AdminDashboard — Admin analytics (Phase 10)
 *
 * - 7 stat cards: patients, doctors, today's + pending appointments,
 *   revenue, available + occupied beds.
 * - 3 Recharts charts: patient growth, appointment outcomes, revenue.
 * - Data comes from useAdminStats() (sample data until the models from
 *   Phases 11–33 exist — see utils/mockAdminStats.js for the swap plan).
 * - Rendered behind RequireRole roles={['admin']} inside MainLayout.
 */

import {
  Users,
  Stethoscope,
  CalendarCheck,
  Clock,
  IndianRupee,
  BedDouble,
  Bed,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import useAdminStats from '../hooks/useAdminStats';

// ── Formatters ────────────────────────────────────────────────
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const compact = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
// Exact counts (patients, doctors, beds…) — compacting 1284 → "1.3K" loses
// information; only revenue (large numbers) uses compact notation.
const countFmt = new Intl.NumberFormat('en-IN');
const todayLabel = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

// ── Shared chart chrome ───────────────────────────────────────
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />;
const axisProps = {
  tick: { fill: '#6b7280', fontSize: 12 },
  tickLine: false,
  axisLine: false,
};
const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid #d1fae5',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: 12,
  },
};

const ChartCard = ({ title, subtitle, className = '', children }) => (
  <section
    className={`rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm ${className}`}
  >
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    <p className="text-xs text-gray-400">{subtitle}</p>
    <div className="mt-4 h-64">{children}</div>
  </section>
);

const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />
);

const AdminDashboard = () => {
  const { stats, patientGrowth, appointmentStats, revenueStats, loading, isSample } =
    useAdminStats();

  if (loading || !stats) {
    return (
      <div aria-busy="true" aria-label="Loading dashboard">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      icon: Users,
      label: 'Total Patients',
      value: countFmt.format(stats.totalPatients),
      hint: 'Registered patients',
      tone: 'emerald',
    },
    {
      icon: Stethoscope,
      label: 'Total Doctors',
      value: countFmt.format(stats.totalDoctors),
      hint: 'Across all departments',
      tone: 'blue',
    },
    {
      icon: CalendarCheck,
      label: "Today's Appointments",
      value: countFmt.format(stats.todayAppointments),
      hint: 'Scheduled for today',
      tone: 'violet',
    },
    {
      icon: Clock,
      label: 'Pending Appointments',
      value: countFmt.format(stats.pendingAppointments),
      hint: 'Awaiting confirmation',
      tone: 'amber',
    },
    {
      icon: IndianRupee,
      label: 'Revenue (this month)',
      value: inrCompact.format(stats.revenueThisMonth),
      hint: 'Billed this month',
      tone: 'teal',
    },
    {
      icon: BedDouble,
      label: 'Available Beds',
      value: countFmt.format(stats.availableBeds),
      hint: 'Ready for admission',
      tone: 'emerald',
    },
    {
      icon: Bed,
      label: 'Occupied Beds',
      value: countFmt.format(stats.occupiedBeds),
      hint: 'Currently admitted',
      tone: 'rose',
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-sm text-gray-500">Hospital overview — {todayLabel}</p>
        </div>
        {isSample && (
          <span
            title="Placeholder figures until the Patient, Doctor, Appointment, Bed and Invoice models exist (Phases 11–33)."
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Sample data
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Patient Growth" subtitle="Total registered patients, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={patientGrowth} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              {grid}
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => compact.format(v)} width={50} />
              <Tooltip {...tooltipStyle} formatter={(v) => [compact.format(v), 'Patients']} />
              <Area
                type="monotone"
                dataKey="patients"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#patientsFill)"
                name="Patients"
              />
              <defs>
                <linearGradient id="patientsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appointments" subtitle="Completed vs cancelled, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appointmentStats} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              {grid}
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => compact.format(v)} width={50} />
              <Tooltip {...tooltipStyle} formatter={(v, name) => [compact.format(v), name]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} name="Completed" />
              <Bar dataKey="cancelled" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Revenue"
          subtitle="Billed revenue, last 6 months"
          className="lg:col-span-2 xl:col-span-1"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueStats} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              {grid}
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => compact.format(v)} width={55} />
              <Tooltip {...tooltipStyle} formatter={(v) => [inr.format(v), 'Revenue']} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#059669' }}
                activeDot={{ r: 5 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
