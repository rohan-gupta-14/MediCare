/**
 * useAdminStats.js — Data source for the admin dashboard (Phase 10)
 *
 * Returns { stats, patientGrowth, appointmentStats, revenueStats, loading, isSample }
 *
 * - `isSample: true` marks the numbers as placeholder data (shown as a chip
 *   in the UI) until the real aggregation endpoint exists.
 * - The simulated delay keeps the dashboard's loading skeleton honest —
 *   replace the whole body with `api.get('/stats/admin')` when the models
 *   land (see utils/mockAdminStats.js for the swap plan). Same shapes.
 */

import { useEffect, useState } from 'react';
import {
  ADMIN_STATS,
  PATIENT_GROWTH,
  APPOINTMENT_STATS,
  REVENUE_STATS,
} from '../utils/mockAdminStats';

const SIMULATED_FETCH_MS = 400;

const useAdminStats = () => {
  const [state, setState] = useState({
    stats: null,
    patientGrowth: [],
    appointmentStats: [],
    revenueStats: [],
    loading: true,
    isSample: true,
  });

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setState({
        stats: ADMIN_STATS,
        patientGrowth: PATIENT_GROWTH,
        appointmentStats: APPOINTMENT_STATS,
        revenueStats: REVENUE_STATS,
        loading: false,
        isSample: true,
      });
    }, SIMULATED_FETCH_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  return state;
};

export default useAdminStats;
