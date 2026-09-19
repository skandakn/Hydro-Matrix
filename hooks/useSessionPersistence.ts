/**
 * HYDRO MATRIX: Session Persistence Hook
 *
 * Handles creating/updating simulation sessions in Supabase,
 * batch-writing telemetry, and saving comparison benchmarks.
 * All API calls are fire-and-forget — failures are logged but
 * never interrupt the simulation.
 */

'use client';

import { useCallback, useRef } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';

const TELEMETRY_BATCH_EVERY = 5; // flush to DB every 5 ticks

export function useSessionPersistence() {
  const sessionIdRef = useRef<string | null>(null);
  const lastFlushedTickRef = useRef<number>(-1);
  const pendingTelemetryRef = useRef<object[]>([]);

  const store = useFloodSimulation();

  /** Called when user loads a scenario — creates a DB session row */
  const startSession = useCallback(async () => {
    try {
      const s = useFloodSimulation.getState();
      const scenarioNames: Record<string, string> = {
        'guwahati-monsoon': 'Guwahati Monsoon Baseline',
        'meghalaya-cloudburst': 'Khasi Foothill Cloudburst Surge',
        'gmda-pumps-failure': 'GMDA 20 Auto-Priming Pump Grid Blackout',
        'brahmaputra-backflow': 'Brahmaputra High Stage Sluice Lock',
        'zoo-road-choke': 'Zoo Road Bahini-Bharalu Debris Choke',
      };

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: s.activeScenarioId,
          scenario_name: scenarioNames[s.activeScenarioId] ?? s.activeScenarioId,
          rainfall_intensity_mmhr: s.config.rainfallIntensity,
          drainage_efficiency: s.config.drainageSystemEfficiency,
          brahmaputra_stage_m: s.config.brahmaputraFloodStageMeters,
          sluice_gate_open: s.config.sluiceGateOpen,
          active_pump_count: s.activePumpsCount,
          disasters_injected: [],
        }),
      });

      if (res.ok) {
        const { session } = await res.json();
        sessionIdRef.current = session.id;
        lastFlushedTickRef.current = -1;
        pendingTelemetryRef.current = [];
      }
    } catch (err) {
      console.warn('[Persistence] startSession failed (non-critical):', err);
    }
  }, []);

  /** Accumulate telemetry point; flush to DB every TELEMETRY_BATCH_EVERY ticks */
  const recordTelemetryTick = useCallback((tick: number) => {
    if (!sessionIdRef.current) return;

    const s = useFloodSimulation.getState();
    const lastPoint = s.telemetryHistory[s.telemetryHistory.length - 1];
    if (!lastPoint) return;

    pendingTelemetryRef.current.push({
      tick,
      elapsed_minutes: lastPoint.elapsedMinutes,
      time_label: lastPoint.timeLabel,
      flooded_area_sqkm: lastPoint.floodedAreaSqKm,
      affected_population: lastPoint.affectedPopulation,
      critical_zones: lastPoint.criticalZones,
      warning_zones: lastPoint.warningZones,
      max_water_depth: lastPoint.maxWaterDepth,
      avg_drainage_efficiency: lastPoint.avgDrainageEfficiency,
      bahini_bharalu_flow_m3s: lastPoint.bahiniBharaluFlowM3S ?? null,
      active_pumps_count: lastPoint.activePumpsCount ?? null,
    });

    const shouldFlush =
      tick - lastFlushedTickRef.current >= TELEMETRY_BATCH_EVERY &&
      pendingTelemetryRef.current.length > 0;

    if (shouldFlush) {
      const points = [...pendingTelemetryRef.current];
      pendingTelemetryRef.current = [];
      lastFlushedTickRef.current = tick;

      fetch(`/api/sessions/${sessionIdRef.current}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      }).catch(err => console.warn('[Persistence] telemetry flush failed:', err));
    }
  }, []);

  /** Called on pause/reset — updates session KPIs and flushes remaining telemetry */
  const flushSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const id = sessionIdRef.current;
    const s = useFloodSimulation.getState();

    // Flush any remaining telemetry
    if (pendingTelemetryRef.current.length > 0) {
      const points = [...pendingTelemetryRef.current];
      pendingTelemetryRef.current = [];
      fetch(`/api/sessions/${id}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      }).catch(err => console.warn('[Persistence] final telemetry flush failed:', err));
    }

    // Update session KPIs
    fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_ticks: s.currentTick,
        elapsed_seconds: s.elapsedSeconds,
        peak_flooded_area_sqkm: s.floodedAreaSqKm,
        peak_affected_population: s.affectedPopulation,
        peak_water_depth: s.maxWaterDepth,
        peak_critical_zone_count: s.criticalZoneCount,
        total_drained_volume_m3: s.totalDrainedVolume,
        active_pump_count: s.activePumpsCount,
        disasters_injected: s.activeDisasters,
        ended_at: new Date().toISOString(),
      }),
    }).catch(err => console.warn('[Persistence] flushSession PATCH failed:', err));
  }, []);

  /** Save comparison benchmarks to DB after they are computed */
  const saveBenchmarks = useCallback(async () => {
    try {
      const s = useFloodSimulation.getState();
      if (!s.comparisonData.length) return;

      const records = s.comparisonData.map(r => ({
        scenario_id: r.scenarioId,
        scenario_name: r.scenarioName,
        peak_flooded_area_sqkm: r.peakFloodedAreaSqKm,
        peak_affected_population: r.peakAffectedPopulation,
        peak_water_depth: r.peakWaterDepth,
        time_to_first_critical_min: r.timeToFirstCriticalMin ?? null,
        infrastructure_compromised_count: r.infrastructureCompromisedCount,
        data_points: r.dataPoints,
        config_hash: `${r.scenarioId}-v1`,
      }));

      await fetch('/api/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
    } catch (err) {
      console.warn('[Persistence] saveBenchmarks failed (non-critical):', err);
    }
  }, []);

  return {
    sessionId: sessionIdRef.current,
    startSession,
    recordTelemetryTick,
    flushSession,
    saveBenchmarks,
  };
}
