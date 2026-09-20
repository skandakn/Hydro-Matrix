/**
 * HYDRO MATRIX: Right Drawer (Telemetry & Analytics Panel)
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Visual Story Architecture:
 * 1. WHAT IS HAPPENING NOW? (Key 2x2 Metrics: Flooded Area, Affected Population, Critical Zones, GMDA Pumps)
 * 2. WHAT COULD HAPPEN? (Compact Scenario Comparison Switcher & Matrix Launcher)
 * 3. HOW IS THE FLOOD CHANGING? (Basin Inundation Progression Curve)
 * 4. HOW IS WATER BEING DISCHARGED? (Channel Flow & Outfall Discharge Curve)
 * 5. SYSTEM STATUS (Real-time Simulation, Pump Fleet & Flow telemetry readout)
 * 
 * Additional Tabs:
 * - 18 Automatic Weather Stations (AWS) Live Data Feed
 * - High-Risk Vulnerable Hotspots Watchlist
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { GridNode, TelemetryPoint } from '@/types/simulation';
import { PRESET_SCENARIOS } from '@/lib/simulation-engine/scenarios';
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
  ChevronRight,
  Shield,
  ExternalLink,
  Radio,
  Droplets,
  Wind,
  Battery,
  Waves,
  Users,
  Cpu,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { formatPopulation } from '@/lib/utils';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    dataKey?: string;
    name?: string;
    payload?: TelemetryPoint;
  }>;
  label?: string;
}

const InundationTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const rawVal = payload[0]?.value;
    const formattedVal = typeof rawVal === 'number' ? rawVal.toFixed(2) : rawVal;
    return (
      <div className="rounded-lg border border-cyan-500/40 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur-md text-left pointer-events-none">
        <div className="font-mono text-[10px] text-slate-400">{label}</div>
        <div className="font-mono text-base font-bold text-cyan-300 leading-tight my-0.5">
          {formattedVal} km²
        </div>
        <div className="text-[10px] text-slate-400 font-medium">Flooded basin area</div>
      </div>
    );
  }
  return null;
};

const FlowTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const rawFlow = payload.find((p) => p.dataKey === 'bahiniBharaluFlowM3S')?.value;
    const formattedFlow = typeof rawFlow === 'number' ? rawFlow.toFixed(1) : rawFlow;
    return (
      <div className="rounded-lg border border-cyan-500/40 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur-md text-left pointer-events-none">
        <div className="font-mono text-[10px] text-slate-400">{label}</div>
        <div className="font-mono text-base font-bold text-cyan-300 leading-tight my-0.5">
          {formattedFlow} m³/s
        </div>
        <div className="text-[10px] text-slate-400 font-medium">Channel discharge</div>
      </div>
    );
  }
  return null;
};

const SCENARIO_SHORT_LABELS: Record<string, string> = {
  'guwahati-monsoon': 'BASELINE',
  'meghalaya-cloudburst': 'CLOUDBURST',
  'gmda-pumps-failure': 'PUMP OUTAGE',
  'brahmaputra-backflow': 'RIVER LOCK',
  'zoo-road-choke': 'DRAIN CHOKE',
};

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
    activeScenarioId,
    loadScenario,
    isPlaying,
  } = useFloodSimulation();

  const {
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    setActiveModal,
    playTacticalAlertSound,
    isTourOpen,
    tourStep,
    t,
  } = useUIContext();

  const [activeTab, setActiveTab] = useState<'kpi' | 'aws' | 'watchlist'>('kpi');
  const [awsSearch, setAwsSearch] = useState('');

  // Auto-switch to KPI tab when Tour reaches Step 6 (telemetry stats)
  useEffect(() => {
    if (isTourOpen && tourStep === 5) {
      setActiveTab('kpi');
    }
  }, [isTourOpen, tourStep]);

  if (!isRightDrawerOpen) {
    return (
      <button
        onClick={() => setIsRightDrawerOpen(true)}
        className="absolute top-16 right-0 z-30 flex items-center gap-2 rounded-l-lg border border-r-0 border-cyan-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-transform hover:-translate-x-1"
        title={t('telemetryAndFeed', 'TELEMETRY & 18 AWS FEED')}
      >
        <Activity className="h-4 w-4 text-cyan-400" />
        <span>{t('telemetryAndFeed', 'TELEMETRY & 18 AWS FEED')}</span>
      </button>
    );
  }

  // Filter critical zones (handles 2D grid)
  const flatCells = Array.isArray(grid[0])
    ? (grid as unknown as GridNode[][]).flat()
    : (grid as unknown as GridNode[]);

  const criticalAndApproaching = flatCells
    .filter(
      (n) =>
        n.status === 'CRITICAL' ||
        (n.timeToCriticalMinutes !== null && n.timeToCriticalMinutes <= 90)
    )
    .sort((a, b) => {
      const aTime = a.status === 'CRITICAL' ? 0 : (a.timeToCriticalMinutes ?? 999);
      const bTime = b.status === 'CRITICAL' ? 0 : (b.timeToCriticalMinutes ?? 999);
      return aTime - bTime;
    });

  // Filter AWS stations
  const filteredAWS = weatherStations.filter(
    (s) =>
      s.name.toLowerCase().includes(awsSearch.toLowerCase()) ||
      s.stationCode.toLowerCase().includes(awsSearch.toLowerCase())
  );

  const activePreset =
    PRESET_SCENARIOS.find((p) => p.id === activeScenarioId) || PRESET_SCENARIOS[0];

  return (
    <aside className="relative z-30 flex flex-col w-full sm:w-[22rem] md:w-[24rem] max-w-full h-full max-h-screen border-l border-slate-800/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-y-auto overflow-x-hidden">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 shadow-sm shadow-cyan-950">
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100">
                {t('guwahatiTelemetry', 'Guwahati Telemetry')}
              </h2>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Real-time flood monitoring
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={() => setIsRightDrawerOpen(false)}
          title={t('collapsePanel', 'Collapse Panel')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3.5 space-y-3.5 text-slate-200">
        {/* ── TABS: COMPACT SEGMENTED CONTROL ────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-1 text-xs">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`flex-1 py-1.5 rounded-md text-[11px] transition-all font-medium flex items-center justify-center gap-1.5 ${
              activeTab === 'kpi'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('telemetryTab', 'Telemetry')}</span>
          </button>
          <button
            onClick={() => setActiveTab('aws')}
            className={`flex-1 py-1.5 rounded-md text-[11px] transition-all font-medium flex items-center justify-center gap-1.5 ${
              activeTab === 'aws'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm shadow-amber-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="h-3 w-3" />
            <span>{t('awsFeedTab', '18 AWS Feed')}</span>
            <span className="text-[9px] font-mono opacity-75">({weatherStations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-1.5 rounded-md text-[11px] transition-all font-medium flex items-center justify-center gap-1.5 ${
              activeTab === 'watchlist'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm shadow-rose-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('watchlistTab', 'Watchlist')}</span>
            {criticalAndApproaching.length > 0 && (
              <span
                className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                  criticalZoneCount > 0
                    ? 'bg-rose-500/40 text-rose-200 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {criticalAndApproaching.length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1: TELEMETRY & KPIS ────────────────────────────────────────── */}
        {activeTab === 'kpi' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* 1. WHAT IS HAPPENING NOW? (KEY METRICS 2x2 GRID) */}
            <div
              data-tour="telemetry-stats"
              id="tour-telemetry-stats"
              className="grid grid-cols-2 gap-2"
            >
              {/* Metric 1: Flooded Basin Area (Cyan) */}
              <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>{t('floodedBasinArea', 'Flooded Basin Area')}</span>
                  <Waves className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold text-cyan-400">
                    {floodedAreaSqKm.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">km²</span>
                </div>
                <div className="mt-1 text-[11px] text-cyan-300/80 font-mono truncate">
                  {floodedArea} sectors inundated
                </div>
              </div>

              {/* Metric 2: Affected Residents (Amber) */}
              <div className="rounded-xl border border-amber-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>{t('affectedResidentsLabel', 'Affected Residents')}</span>
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold text-amber-400">
                    {formatPopulation(affectedResidents || affectedPopulation)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">people</span>
                </div>
                <div className="mt-1 text-[11px] text-amber-300/80 font-medium truncate">
                  Low-lying basin areas
                </div>
              </div>

              {/* Metric 3: Critical Sectors (Red) */}
              <div className="rounded-xl border border-rose-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>{t('criticalSectors', 'Critical Sectors')}</span>
                  <AlertOctagon className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold text-rose-400">
                    {criticalZoneCount}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">zones</span>
                </div>
                <div className="mt-1 text-[11px] text-rose-300/80 font-medium truncate">
                  {warningZoneCount} in warning state
                </div>
              </div>

              {/* Metric 4: GMDA Pumps Armed (Blue) */}
              <div className="rounded-xl border border-blue-500/30 bg-slate-900/60 p-3 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  <span>{t('gmdaPumpsArmed', 'GMDA Pumps Armed')}</span>
                  <Cpu className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold text-blue-400">
                    {activePumps ?? activePumpsCount}/20
                  </span>
                  <span className="text-xs text-slate-400 font-mono">units</span>
                </div>
                <div className="mt-1 text-[11px] text-blue-300/80 font-mono truncate">
                  Flow: {bahiniBharaluFlowM3S} m³/s
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
                <span>{t('scenarioComparisonMatrix', 'SCENARIO COMPARISON MATRIX')}</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
            </Button>

            {/* Recharts: Inundation Curve */}
            <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{t('basinInundationProgression', 'Basin Inundation Progression')}</span>
                </div>
                <button
                  onClick={() => {
                    generateComparisonBenchmarks();
                    setActiveModal('comparison');
                    playTacticalAlertSound('action');
                  }}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  title="Open full scenario comparison matrix modal"
                >
                  <span>Full Matrix</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>

              {/* Selectable scenario buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {PRESET_SCENARIOS.map((scenario) => {
                  const isSelected = activeScenarioId === scenario.id;
                  const shortName = SCENARIO_SHORT_LABELS[scenario.id] || scenario.name;
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => {
                        loadScenario(scenario.id);
                        playTacticalAlertSound('action');
                      }}
                      className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all border ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                          : 'bg-slate-900/80 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                      title={scenario.name}
                    >
                      {shortName}
                    </button>
                  );
                })}
              </div>

              {/* Active scenario brief description */}
              {activePreset && (
                <p className="text-[10px] text-slate-400 leading-relaxed truncate pt-0.5">
                  {activePreset.description}
                </p>
              )}
            </div>

            {/* 3. HOW IS THE FLOOD CHANGING? (BASIN INUNDATION CHART) */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Basin Inundation
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Flooded area over time
                  </div>
                </div>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME
                </span>
              </div>

              <div className="h-40 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={telemetryHistory}
                    margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="basinAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#64748b"
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={9}
                      tickLine={false}
                      unit=" km²"
                    />
                    <Tooltip
                      content={<InundationTooltip />}
                      wrapperStyle={{ outline: 'none', zIndex: 50 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="floodedAreaSqKm"
                      name="Flooded Area"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#basinAreaGrad)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. HOW IS WATER BEING DISCHARGED? (CHANNEL FLOW CHART) */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Channel Flow
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Water discharge over time
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-cyan-300">
                    {bahiniBharaluFlowM3S} m³/s
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Current Rate
                  </div>
                </div>
              </div>

              <div className="h-32 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={telemetryHistory}
                    margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#64748b"
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={9}
                      tickLine={false}
                      unit=" m³/s"
                    />
                    <Tooltip
                      content={<FlowTooltip />}
                      wrapperStyle={{ outline: 'none', zIndex: 50 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bahiniBharaluFlowM3S"
                      name="Discharge"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5. SYSTEM STATUS ROW */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] font-mono flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPlaying
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-slate-200 font-semibold">
                  {isPlaying ? 'Simulation Active' : 'Simulation Paused'}
                </span>
              </div>
              <span className="text-slate-700">|</span>
              <span className="text-blue-300 font-medium">
                Pumps {activePumps ?? activePumpsCount}/20
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-cyan-300 font-medium">
                Flow {bahiniBharaluFlowM3S} m³/s
              </span>
            </div>
          </div>
        )}

        {/* ── TAB 2: 18 AUTOMATIC WEATHER STATIONS (AWS) LIVE DATA FEED ──────── */}
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
                const isWarning =
                  station.rainfallMmHr >= 35.0 || station.status === 'WARNING';
                return (
                  <div
                    key={station.id}
                    onClick={() =>
                      selectCell(`cell-${station.gridX}-${station.gridY}`)
                    }
                    className={`cursor-pointer rounded-lg p-2.5 transition-all border ${
                      isWarning
                        ? 'border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                          }`}
                        />
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
                        <span>
                          Rain: <strong>{station.rainfallMmHr} mm/h</strong>
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        24h Acc:{' '}
                        <strong className="text-white">
                          {station.accumulatedRainfall24hMm} mm
                        </strong>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Wind className="h-3 w-3" />
                        <span>
                          {station.windSpeedKmh} km/h • {station.humidityPercent}% RH
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Battery className="h-3 w-3 text-emerald-400" />
                        <span>
                          {station.batteryLevelPercent}% • {station.elevationMeters}m MSL
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: CRITICAL EARLY WARNING WATCHLIST ────────────────────────── */}
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
                <span>
                  All sectors across the Bahini-Bharalu basin currently within safe drainage thresholds.
                </span>
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
                        <span className="font-bold text-xs text-slate-100">
                          {cell.name}
                        </span>
                        <Badge
                          variant={isCrit ? 'critical' : 'warning'}
                          className="text-[9px]"
                        >
                          {isCrit ? 'CRITICAL' : 'WARNING'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 my-1.5">
                        <div>
                          Depth:{' '}
                          <strong className="font-mono text-cyan-300">
                            {cell.currentWaterLevel.toFixed(2)}m
                          </strong>
                        </div>
                        <div>
                          Pop:{' '}
                          <strong className="font-mono text-slate-200">
                            {cell.population.toLocaleString()}
                          </strong>
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
                          {cell.barrierActive
                            ? 'Barrier Active (+1.0m)'
                            : 'Deploy Barrier'}
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
