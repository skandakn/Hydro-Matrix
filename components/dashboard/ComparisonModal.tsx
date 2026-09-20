/**
 * HYDRO MATRIX: Functional Scenario Comparison Matrix
 * Localization: Guwahati — Bahini/Bharalu Basin & Metropolitan Catchment
 * 
 * Accurately compares flood metrics across 4 standard hydrological benchmark scenarios:
 * 1. Normal Monsoon Baseline (~22 mm/h, 100% drainage capacity)
 * 2. Heavy Convective Cloudburst (~85 mm/h, standard drainage)
 * 3. Critical Pump Grid Failure (65 mm/h, 80% pump fleet offline)
 * 4. Sluice Gate Closed / High River Stage (45 mm/h, 0% natural gravity river outflow)
 * 
 * Features:
 * - Analytical Comparison Table:
 *   * Peak Inundation Area (km²)
 *   * Critical Sectors Count (zones with depth > 0.75m)
 *   * Estimated Population Exposed/Displaced
 *   * Evacuation Urgency Index (Low / Moderate / Severe / Immediate)
 * - Visual Multi-Curve Chart (Recharts):
 *   * Flooded Area (km²) vs Time (+0h to +24h) across all 4 scenarios
 */

'use client';

import React, { useState } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  X,
  BarChart3,
  TrendingUp,
  Layers,
  PlayCircle,
  Waves,
} from 'lucide-react';
import { formatPopulation } from '@/lib/utils';
import { EvacuationUrgencyLevel } from '@/types/simulation';

const SCENARIO_COLORS: Record<string, string> = {
  'guwahati-monsoon': '#10b981',      // Emerald
  'meghalaya-cloudburst': '#06b6d4',  // Cyan
  'gmda-pumps-failure': '#f59e0b',    // Amber
  'brahmaputra-backflow': '#f43f5e',   // Crimson
  'normal-monsoon-baseline': '#10b981',
  'heavy-cloudburst': '#06b6d4',
  'critical-pump-failure': '#f59e0b',
  'sluice-closed-high-stage': '#f43f5e',
};

export const ComparisonModal: React.FC = () => {
  const { comparisonData, loadScenario, activeScenarioId } = useFloodSimulation();
  const { activeModal, setActiveModal, playTacticalAlertSound } = useUIContext();

  const [activeMetricTab, setActiveMetricTab] = useState<'area' | 'population' | 'depth'>('area');

  if (activeModal !== 'comparison') return null;

  // Filter to the 4 canonical benchmark scenarios if more exist
  const benchmarkRecords = comparisonData.filter(rec =>
    ['guwahati-monsoon', 'meghalaya-cloudburst', 'gmda-pumps-failure', 'brahmaputra-backflow'].includes(rec.scenarioId)
  ).length > 0
    ? comparisonData.filter(rec =>
        ['guwahati-monsoon', 'meghalaya-cloudburst', 'gmda-pumps-failure', 'brahmaputra-backflow'].includes(rec.scenarioId)
      )
    : comparisonData;

  // Build merged timeseries data for Recharts multi-curve across +0h to +24h
  const mergedTimeline: Array<{
    timeLabel: string;
    [key: string]: number | string;
  }> = [];

  if (benchmarkRecords.length > 0 && benchmarkRecords[0].dataPoints) {
    const pointCount = benchmarkRecords[0].dataPoints.length;
    for (let i = 0; i < pointCount; i++) {
      const row: { timeLabel: string; [key: string]: number | string } = {
        timeLabel: benchmarkRecords[0].dataPoints[i].timeLabel,
      };

      for (const record of benchmarkRecords) {
        if (record.dataPoints && record.dataPoints[i]) {
          const pt = record.dataPoints[i];
          const key = record.shortName || record.scenarioName;
          if (activeMetricTab === 'area') {
            row[key] = pt.floodedAreaSqKm;
          } else if (activeMetricTab === 'population') {
            row[key] = pt.affectedPopulation;
          } else {
            row[key] = pt.maxWaterDepth;
          }
        }
      }
      mergedTimeline.push(row);
    }
  }

  // Helper to format urgency index badge
  const renderUrgencyBadge = (urgency: EvacuationUrgencyLevel) => {
    switch (urgency) {
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LOW
          </span>
        );
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            MODERATE
          </span>
        );
      case 'Severe':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-950/80 text-orange-300 border border-orange-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            SEVERE
          </span>
        );
      case 'Immediate':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950/90 text-rose-200 border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            IMMEDIATE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Guwahati Hydrological Scenario Comparison Matrix
                </h3>
                <Badge variant="cyan" className="text-[10px] font-mono">
                  4 BENCHMARKS
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Comparative 24-hour flood dynamics, inundation exposure, and evacuation urgency indices across GMDA drainage baselines
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close Comparison Matrix"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar">
          {/* 1. ANALYTICAL COMPARISON TABLE */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Analytical Comparison Table (DPR Standards)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Baseline Depth Threshold: &gt;0.75m MSL
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    <th className="py-2.5 px-3.5">Hydrological Scenario</th>
                    <th className="py-2.5 px-3.5">Rainfall & Drainage</th>
                    <th className="py-2.5 px-3.5 text-right">Peak Inundation (km²)</th>
                    <th className="py-2.5 px-3.5 text-center">Critical Sectors (&gt;0.75m)</th>
                    <th className="py-2.5 px-3.5 text-right">Population Exposed</th>
                    <th className="py-2.5 px-3.5 text-center">Evacuation Urgency</th>
                    <th className="py-2.5 px-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {benchmarkRecords.map((rec) => {
                    const isCurrent = activeScenarioId === rec.scenarioId;
                    const col = SCENARIO_COLORS[rec.scenarioId] || '#38bdf8';

                    return (
                      <tr
                        key={rec.scenarioId}
                        className={`transition-colors hover:bg-slate-800/30 ${
                          isCurrent ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        {/* Scenario Name & Indicator */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: col }}
                            />
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <span>{rec.scenarioName}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-mono text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {rec.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rainfall & Drainage Specs */}
                        <td className="py-3 px-3.5 font-mono text-[11px]">
                          <div className="text-slate-200 font-semibold">
                            {rec.rainfallIntensity ? `${rec.rainfallIntensity} mm/h` : 'Variable'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Drainage: {rec.drainageCapacityPercent !== undefined ? `${rec.drainageCapacityPercent}%` : 'Standard'}
                          </div>
                        </td>

                        {/* Peak Inundation Area */}
                        <td className="py-3 px-3.5 text-right font-mono">
                          <div className="font-bold text-white text-sm">
                            {rec.peakFloodedAreaSqKm.toFixed(2)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">km²</span>
                          </div>
                          <div className="text-[10px] text-cyan-300/80">
                            Max Depth: {rec.peakWaterDepth.toFixed(2)}m
                          </div>
                        </td>

                        {/* Critical Sectors Count */}
                        <td className="py-3 px-3.5 text-center font-mono">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              rec.criticalSectorsCount > 0
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {rec.criticalSectorsCount}{' '}
                            <span className="text-[10px] font-normal">sectors</span>
                          </span>
                        </td>

                        {/* Population Exposed */}
                        <td className="py-3 px-3.5 text-right font-mono">
                          <div className="font-bold text-amber-300 text-sm">
                            {formatPopulation(rec.peakAffectedPopulation)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            displaced / at-risk
                          </div>
                        </td>

                        {/* Evacuation Urgency Index */}
                        <td className="py-3 px-3.5 text-center">
                          {renderUrgencyBadge(rec.evacuationUrgency)}
                        </td>

                        {/* Action: Load or Active */}
                        <td className="py-3 px-3.5 text-center">
                          <Button
                            size="xs"
                            variant={isCurrent ? 'cyan' : 'outline'}
                            onClick={() => {
                              loadScenario(rec.scenarioId);
                              setActiveModal('none');
                              playTacticalAlertSound('action');
                            }}
                            className="text-[10px] font-mono h-7 px-2.5 whitespace-nowrap"
                          >
                            {isCurrent ? (
                              'Simulating Now'
                            ) : (
                              <span className="flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                Simulate
                              </span>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. VISUAL MULTI-CURVE CHART (RECHARTS) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    24-Hour Comparative Dynamics Curve (+0h to +24h)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Comparative flood progression across all 4 scenarios plotted over a 24-hour crisis horizon
                  </p>
                </div>
              </div>

              {/* Metric Selector Tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 self-start sm:self-auto">
                <button
                  onClick={() => setActiveMetricTab('area')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeMetricTab === 'area'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Flooded Area (km²)
                </button>
                <button
                  onClick={() => setActiveMetricTab('population')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeMetricTab === 'population'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Population Exposed
                </button>
                <button
                  onClick={() => setActiveMetricTab('depth')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeMetricTab === 'depth'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Max Water Depth (m)
                </button>
              </div>
            </div>

            {/* Recharts Curve Container */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedTimeline} margin={{ top: 12, right: 24, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
                  <XAxis
                    dataKey="timeLabel"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    unit={activeMetricTab === 'area' ? ' km²' : activeMetricTab === 'depth' ? 'm' : ''}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030712',
                      borderColor: '#334155',
                      fontSize: '11px',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  {benchmarkRecords.map((rec) => {
                    const key = rec.shortName || rec.scenarioName;
                    const col = SCENARIO_COLORS[rec.scenarioId] || '#38bdf8';
                    return (
                      <Line
                        key={rec.scenarioId}
                        type="monotone"
                        dataKey={key}
                        stroke={col}
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: col }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. SCENARIO BENCHMARK SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {benchmarkRecords.map((rec) => {
              const col = SCENARIO_COLORS[rec.scenarioId] || '#38bdf8';
              const isCurrent = activeScenarioId === rec.scenarioId;

              return (
                <div
                  key={rec.scenarioId}
                  className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-cyan-400 bg-cyan-950/25 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col }} />
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                          {rec.badge || 'BENCHMARK'}
                        </span>
                      </div>
                      {renderUrgencyBadge(rec.evacuationUrgency)}
                    </div>

                    <h5 className="font-bold text-xs text-slate-200 line-clamp-1 mb-1">
                      {rec.scenarioName}
                    </h5>

                    <div className="space-y-1.5 mt-3 text-[11px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Peak Flooded Area:</span>
                        <strong className="font-mono text-white">
                          {rec.peakFloodedAreaSqKm.toFixed(2)} km²
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Critical Sectors:</span>
                        <strong className="font-mono text-rose-300">
                          {rec.criticalSectorsCount}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Pop. Exposed:</span>
                        <strong className="font-mono text-amber-300">
                          {formatPopulation(rec.peakAffectedPopulation)}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Time to Critical:</span>
                        <strong className="font-mono text-slate-200">
                          {rec.timeToFirstCriticalMin !== null ? `${rec.timeToFirstCriticalMin}m` : 'None (Safe)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant={isCurrent ? 'cyan' : 'outline'}
                    onClick={() => {
                      loadScenario(rec.scenarioId);
                      setActiveModal('none');
                      playTacticalAlertSound('action');
                    }}
                    className="mt-3 w-full text-[10px] font-mono h-7"
                  >
                    {isCurrent ? 'Simulating Now' : 'Load Into Simulation'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 pt-3 gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <Waves className="h-3.5 w-3.5 text-cyan-400" />
            <span>* Simulated via 2D Shallow Water Diffusive Wave Momentum &amp; Cellular Automata physics across Guwahati catchment.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveModal('none')}>
            Close Matrix
          </Button>
        </div>
      </div>
    </div>
  );
};
