/**
 * HYDRO MATRIX: Right Drawer (Telemetry & Analytics Panel)
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - Live simulated data feed from the 18 Automatic Weather Stations (AWS) around Guwahati
 * - Crisis KPIs: Total flooded area (km²), affected population, active critical zones
 * - Real-time Recharts telemetry curves for Bahini-Bharalu flow dynamics and GMDA pump operations
 * - Active Critical Zones Watchlist prioritized by Time-to-Critical countdowns
 * - Scenario comparison launcher
 */

'use client';

import React, { useState } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { GridNode } from '@/types/simulation';
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
  Radio,
  Cpu,
  Droplets,
  Wind,
  Battery,
} from 'lucide-react';
import { formatPopulation } from '@/lib/utils';

export const RightDrawer: React.FC = () => {
  const {
    grid,
    floodedArea,
    floodedAreaSqKm,
    affectedResidents,
    affectedPopulation,
    criticalZoneCount,
    warningZoneCount,
    telemetryHistory,
    weatherStations,
    activePumps,
    activePumpsCount,
    bahiniBharaluFlowM3S,
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

  const [activeTab, setActiveTab] = useState<'kpi' | 'aws' | 'watchlist'>('kpi');
  const [awsSearch, setAwsSearch] = useState('');

  if (!isRightDrawerOpen) {
    return (
      <button
        onClick={() => setIsRightDrawerOpen(true)}
        className="absolute top-16 right-0 z-30 flex items-center gap-2 rounded-l-lg border border-r-0 border-cyan-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-transform hover:-translate-x-1"
        title="Open Telemetry & Analytics"
      >
        <Activity className="h-4 w-4 text-cyan-400" />
        <span>TELEMETRY & 18 AWS FEED</span>
      </button>
    );
  }

  // Filter critical zones (handles 2D grid)
  const flatCells = Array.isArray(grid[0]) ? (grid as unknown as GridNode[][]).flat() : (grid as unknown as GridNode[]);
  const criticalAndApproaching = flatCells
    .filter(n => n.status === 'CRITICAL' || (n.timeToCriticalMinutes !== null && n.timeToCriticalMinutes <= 90))
    .sort((a, b) => {
      const aTime = a.status === 'CRITICAL' ? 0 : (a.timeToCriticalMinutes ?? 999);
      const bTime = b.status === 'CRITICAL' ? 0 : (b.timeToCriticalMinutes ?? 999);
      return aTime - bTime;
    });

  // Filter AWS stations
  const filteredAWS = weatherStations.filter(s =>
    s.name.toLowerCase().includes(awsSearch.toLowerCase()) ||
    s.stationCode.toLowerCase().includes(awsSearch.toLowerCase())
  );

  return (
    <aside className="relative z-30 flex flex-col w-84 md:w-96 h-full max-h-screen border-l border-slate-800/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Guwahati Telemetry
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

      <div className="p-4 space-y-4 text-slate-200">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-xs">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'kpi'
                ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Telemetry
          </button>
          <button
            onClick={() => setActiveTab('aws')}
            className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'aws'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="h-3 w-3" />
            18 AWS Feed
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'watchlist'
                ? 'bg-rose-600 text-white shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Watchlist ({criticalAndApproaching.length})
          </button>
        </div>

        {/* --- TAB 1: TELEMETRY & KPIS --- */}
        {activeTab === 'kpi' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Live KPIs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>Flooded Basin Area</span>
                  <Waves className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-cyan-300">
                    {floodedAreaSqKm.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">km²</span>
                </div>
                <div className="mt-0.5 text-[10px] text-cyan-400/90 font-mono">
                  {floodedArea} sectors ({'>'}0.10m)
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>Affected Residents</span>
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-amber-300">
                    {formatPopulation(affectedResidents || affectedPopulation)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">residents</span>
                </div>
                <div className="mt-0.5 text-[10px] text-amber-400/80 font-medium">
                  Anil/Nabin/Rukminigaon
                </div>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>Critical Sectors</span>
                  <AlertOctagon className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-rose-400">
                    {criticalZoneCount}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">zones</span>
                </div>
                <div className="mt-0.5 text-[10px] text-rose-300/80">
                  {warningZoneCount} in warning state
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>GMDA Pumps Armed</span>
                  <Cpu className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-blue-300">
                    {activePumps ?? activePumpsCount}/20
                  </span>
                  <span className="text-xs text-slate-400 font-mono">units</span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  Flow: <span className="font-mono text-cyan-300">{bahiniBharaluFlowM3S} m³/s</span>
                </div>
              </div>
            </div>

            {/* Scenario Comparison Launcher */}
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
                <span>SCENARIO COMPARISON MATRIX</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
            </Button>

            {/* Recharts: Inundation Curve */}
            <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Basin Inundation Progression</span>
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

            {/* Recharts: Bahini-Bharalu Flow & Active Pumps */}
            <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Waves className="h-3.5 w-3.5 text-blue-400" />
                  <span>Channel Flow & Pump Fleet</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">DISCHARGE</span>
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
                      dataKey="bahiniBharaluFlowM3S"
                      name="Bharalu Discharge (m³/s)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="activePumpsCount"
                      name="Active GMDA Pumps"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: 18 AUTOMATIC WEATHER STATIONS (AWS) LIVE DATA FEED --- */}
        {activeTab === 'aws' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                <span>18 Guwahati Weather Stations</span>
              </div>
              <Badge variant="cyan" className="text-[9px] font-mono">
                LIVE MESH
              </Badge>
            </div>

            <input
              type="text"
              placeholder="Search station name or code..."
              value={awsSearch}
              onChange={(e) => setAwsSearch(e.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredAWS.map((station) => {
                const isWarning = station.rainfallMmHr >= 35.0 || station.status === 'WARNING';
                return (
                  <div
                    key={station.id}
                    onClick={() => selectCell(`cell-${station.gridX}-${station.gridY}`)}
                    className={`cursor-pointer rounded-lg p-2.5 transition-all border ${
                      isWarning
                        ? 'border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className="font-bold text-xs text-white truncate max-w-[180px]">
                          {station.name}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {station.stationCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 my-1">
                      <div className="flex items-center gap-1 text-amber-300 font-medium">
                        <Droplets className="h-3 w-3" />
                        <span>Rain: <strong>{station.rainfallMmHr} mm/h</strong></span>
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        24h Acc: <strong className="text-white">{station.accumulatedRainfall24hMm} mm</strong>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Wind className="h-3 w-3" />
                        <span>{station.windSpeedKmh} km/h • {station.humidityPercent}% RH</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Battery className="h-3 w-3 text-emerald-400" />
                        <span>{station.batteryLevelPercent}% • {station.elevationMeters}m MSL</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 3: CRITICAL EARLY WARNING WATCHLIST --- */}
        {activeTab === 'watchlist' && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                Vulnerable Hotspots Watchlist
              </h3>
              <Badge variant="critical" className="text-[9px]">
                {criticalAndApproaching.length} HIGH RISK
              </Badge>
            </div>

            {criticalAndApproaching.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center text-xs text-slate-400">
                <Shield className="h-6 w-6 text-emerald-400 mx-auto mb-1 opacity-70" />
                <span>All sectors across the Bahini-Bharalu basin currently within safe drainage thresholds.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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
        )}
      </div>
    </aside>
  );
};
