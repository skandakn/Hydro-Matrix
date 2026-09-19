/**
 * FLOWSHIELD: Right Drawer (Telemetry & Analytics Panel)
 * 
 * Features:
 * - Live crisis command KPIs: Total flooded area (km²), affected population, active critical zones
 * - Real-time Recharts telemetry curves: Flood progression and water level trends
 * - Active Critical Zones Early Warning Watchlist with "Estimated Time to Critical Conditions" countdowns
 * - Emergency dispatch actions: Deploy temporary sandbag flood barriers & evacuation alerts
 * - Scenario Comparison view trigger
 */

'use client';

import React from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertOctagon,
  Users,
  Waves,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { formatPopulation } from '@/lib/utils';

export const RightDrawer: React.FC = () => {
  const {
    grid,
    floodedAreaSqKm,
    affectedPopulation,
    criticalZoneCount,
    warningZoneCount,
    maxWaterDepth,
    maxFlowVelocity,
    telemetryHistory,
    selectCell,
    toggleCellBarrier,
    generateComparisonBenchmarks,
  } = useFloodSimulation();

  const {
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    setActiveModal,
    playTacticalAlertSound,
  } = useUIContext();

  if (!isRightDrawerOpen) {
    return (
      <button
        onClick={() => setIsRightDrawerOpen(true)}
        className="absolute top-16 right-0 z-30 flex items-center gap-2 rounded-l-lg border border-r-0 border-cyan-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-transform hover:-translate-x-1"
        title="Open Telemetry & Analytics"
      >
        <Activity className="h-4 w-4 text-cyan-400" />
        <span>TELEMETRY & CRITICAL ZONES</span>
      </button>
    );
  }

  // Filter and sort critical zones or approaching critical zones by urgency
  const criticalAndApproaching = grid
    .filter(n => n.status === 'CRITICAL' || (n.timeToCriticalMinutes !== null && n.timeToCriticalMinutes <= 90))
    .sort((a, b) => {
      // Prioritize cells already critical or with lowest timeToCritical
      const aTime = a.status === 'CRITICAL' ? 0 : (a.timeToCriticalMinutes ?? 999);
      const bTime = b.status === 'CRITICAL' ? 0 : (b.timeToCriticalMinutes ?? 999);
      return aTime - bTime;
    });

  const totalGridCells = grid.length;
  const floodedPercentage = ((floodedAreaSqKm / (totalGridCells * 0.0625)) * 100).toFixed(1);

  return (
    <aside className="relative z-30 flex flex-col w-84 md:w-96 h-full max-h-screen border-l border-slate-800/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Telemetry & Analytics
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={() => setIsRightDrawerOpen(false)}
          title="Collapse Panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5 text-slate-200">
        {/* --- SECTION 1: LIVE CRISIS TELEMETRY KPIS --- */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Flooded Area */}
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              <span>Flooded Area</span>
              <Waves className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-cyan-300">
                {floodedAreaSqKm.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">km²</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {floodedPercentage}% of metro basin
            </div>
          </div>

          {/* Affected Population */}
          <div className="rounded-xl border border-amber-500/30 bg-slate-900/60 p-3 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              <span>Affected Pop.</span>
              <Users className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-amber-300">
                {formatPopulation(affectedPopulation)}
              </span>
              <span className="text-xs text-slate-400 font-mono">people</span>
            </div>
            <div className="mt-1 text-[10px] text-amber-400/80 font-medium">
              In Warning & Crit zones
            </div>
          </div>

          {/* Critical Zones Count */}
          <div className="rounded-xl border border-rose-500/30 bg-slate-900/60 p-3 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              <span>Critical Zones</span>
              <AlertOctagon className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-rose-400">
                {criticalZoneCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">sectors</span>
            </div>
            <div className="mt-1 text-[10px] text-rose-300/80">
              {warningZoneCount} approaching warning
            </div>
          </div>

          {/* Peak Water Depth */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              <span>Peak Depth</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-emerald-300">
                {maxWaterDepth.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">m</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              Flow: <span className="font-mono text-cyan-300">{maxFlowVelocity.toFixed(1)} m/s</span>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: COMPARISON VIEW LAUNCHER BUTTON --- */}
        <Button
          variant="cyan"
          size="sm"
          onClick={() => {
            generateComparisonBenchmarks();
            setActiveModal('comparison');
            playTacticalAlertSound('action');
          }}
          className="w-full justify-between py-2.5 font-semibold text-xs border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-lg shadow-cyan-500/10"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <span>OPEN SCENARIO COMPARISON MATRIX</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
        </Button>

        {/* --- SECTION 3: REAL-TIME RECHARTS TELEMETRY GRAPHS --- */}
        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              <span>Flood Inundation Curve</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">REAL-TIME</span>
          </div>

          <div className="h-36 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: '#334155',
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area
                  type="monotone"
                  dataKey="floodedAreaSqKm"
                  name="Flooded Area (km²)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Level Distribution Area Chart */}
        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Activity className="h-3.5 w-3.5 text-rose-400" />
              <span>Critical vs Warning Zones</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">TELEMETRY</span>
          </div>

          <div className="h-32 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: '#334155',
                    fontSize: '11px',
                    borderRadius: '6px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="criticalZones"
                  name="Critical Zones"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="warningZones"
                  name="Warning Zones"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- SECTION 4: ACTIVE CRITICAL ZONES EARLY WARNING WATCHLIST --- */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <AlertOctagon className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              Critical Early Warning Watchlist
            </h3>
            <Badge variant="critical" className="text-[9px]">
              {criticalAndApproaching.length} HIGH RISK
            </Badge>
          </div>

          {criticalAndApproaching.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center text-xs text-slate-400">
              <Shield className="h-6 w-6 text-emerald-400 mx-auto mb-1 opacity-70" />
              <span>All city sectors currently within safe water thresholds.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {criticalAndApproaching.map((cell) => {
                const isCrit = cell.status === 'CRITICAL';
                return (
                  <div
                    key={cell.id}
                    onClick={() => selectCell(cell.id)}
                    className={`cursor-pointer rounded-lg p-2.5 transition-all border ${
                      isCrit
                        ? 'border-rose-500/50 bg-rose-950/30 hover:bg-rose-950/60'
                        : 'border-amber-500/40 bg-amber-950/20 hover:bg-amber-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-100">{cell.name}</span>
                      <Badge variant={isCrit ? 'critical' : 'warning'} className="text-[9px]">
                        {isCrit ? 'CRITICAL' : 'WARNING'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 my-1.5">
                      <div>
                        Depth: <strong className="font-mono text-cyan-300">{cell.currentWaterLevel.toFixed(2)}m</strong>
                      </div>
                      <div>
                        Pop: <strong className="font-mono text-slate-200">{cell.population.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Estimated Time to Critical Conditions Countdown */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Activity className="h-3 w-3 text-rose-400" />
                        Time to Critical:
                      </span>
                      <span className="font-mono font-bold text-rose-300">
                        {isCrit
                          ? 'THRESHOLD BREACHED'
                          : cell.timeToCriticalMinutes !== null
                          ? `${cell.timeToCriticalMinutes} MIN`
                          : 'STABILIZING'}
                      </span>
                    </div>

                    {/* Quick Barrier Deploy Button */}
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant={cell.barrierActive ? 'cyan' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCellBarrier(cell.id);
                        }}
                        className="text-[10px] h-6 px-2"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {cell.barrierActive ? 'Barrier Active (+1.0m)' : 'Deploy Barrier'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
