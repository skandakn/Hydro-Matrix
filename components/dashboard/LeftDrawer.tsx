/**
 * HYDRO MATRIX: Left Drawer (Guwahati Basin Controls & Emergency Scenarios)
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - 6-hour fixed step timeline controls ([-6h], [+6h], [Reset 0h], "Elapsed Time: +[X] Hours")
 * - Simplified Catchment Precipitation with layman-friendly tags & descriptions
 * - Main River Flood Gate (Bharalumukh Sluice) with clear State A / State B barrier toggle
 * - 20 GMDA auto-priming dewatering pump station controls
 * - Guwahati-calibrated emergency scenarios & live fault injection
 */

'use client';

import React, { useState } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { PRESET_SCENARIOS } from '@/lib/simulation-engine/scenarios';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CloudRain,
  CloudLightning,
  AlertOctagon,
  ShieldAlert,
  Waves,
  Play,
  Pause,
  RotateCcw,
  StepBack,
  StepForward,
  ChevronLeft,
  Sliders,
  Flame,
  Gauge,
  Clock,
  Cpu,
  Power,
  Info,
  Tent,
  Sparkles,
} from 'lucide-react';

export const LeftDrawer: React.FC = () => {
  const {
    elapsedHours,
    isPlaying,
    activeScenarioId,
    config,
    activeDisasters,
    gmdaPumps,
    activePumpIds,
    activePumps,
    rainfall,
    rescueCamps,
    totalShelteredEvacuees,
    totalRescueCapacity,
    autoDeployRecommendedCamps,
    togglePlayPause,
    stepForward6Hours,
    stepBackward6Hours,
    resetToZeroHours,
    setRainfallIntensity,
    setBrahmaputraSluiceGate,
    toggleGMDAPump,
    setAllGMDAPumpsState,
    simulateGMDAPumpsFailure,
    loadScenario,
    injectDisaster,
    removeDisaster,
  } = useFloodSimulation();

  const { isLeftDrawerOpen, setIsLeftDrawerOpen, playTacticalAlertSound, setActiveModal, t } = useUIContext();

  const [pumpsExpanded, setPumpsExpanded] = useState(false);

  if (!isLeftDrawerOpen) {
    return (
      <button
        onClick={() => setIsLeftDrawerOpen(true)}
        className="absolute top-16 left-0 z-30 flex items-center gap-2 rounded-r-lg border border-l-0 border-cyan-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-transform hover:translate-x-1"
        title={t('controlsAndPumps', 'CONTROLS & PUMPS')}
      >
        <Sliders className="h-4 w-4 text-cyan-400" />
        <span>{t('controlsAndPumps', 'CONTROLS & PUMPS')}</span>
      </button>
    );
  }

  // Plain-English rainfall classification
  const getRainfallTag = (mm: number) => {
    if (mm <= 15) {
      return {
        tag: 'Light Rain (Manageable)',
        colorClass: 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40',
        textColor: 'text-emerald-400',
        severity: 'safe',
      };
    }
    if (mm <= 40) {
      return {
        tag: 'Moderate Rain (Channels filling up)',
        colorClass: 'text-cyan-300 bg-cyan-950/70 border-cyan-500/40',
        textColor: 'text-cyan-400',
        severity: 'cyan',
      };
    }
    if (mm <= 80) {
      return {
        tag: 'Heavy Downpour (Waterlogging begins)',
        colorClass: 'text-amber-300 bg-amber-950/70 border-amber-500/40',
        textColor: 'text-amber-400',
        severity: 'warning',
      };
    }
    return {
      tag: 'Extreme Cloudburst (Severe flash flood danger)',
      colorClass: 'text-rose-300 bg-rose-950/70 border-rose-500/40 animate-pulse',
      textColor: 'text-rose-400',
      severity: 'critical',
    };
  };

  const rainInfo = getRainfallTag(rainfall);

  const scenarioIcons: Record<string, React.ReactNode> = {
    CloudRain: <CloudRain className="h-4 w-4 text-blue-400" />,
    CloudLightning: <CloudLightning className="h-4 w-4 text-amber-400" />,
    AlertOctagon: <AlertOctagon className="h-4 w-4 text-rose-400" />,
    ShieldAlert: <ShieldAlert className="h-4 w-4 text-orange-400" />,
    Waves: <Waves className="h-4 w-4 text-cyan-400" />,
  };

  const allPumpsActive = activePumpIds.size === gmdaPumps.length;

  return (
    <aside className="relative z-30 flex flex-col w-84 md:w-96 h-full max-h-screen border-r border-slate-800/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-y-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            {t('basinControls', 'Guwahati Basin Controls')}
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={() => setIsLeftDrawerOpen(false)}
          title={t('collapsePanel', 'Collapse Panel')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5 text-slate-200">
        {/* --- SECTION 1: SIMULATION TIMELINE (FIXED 6-HOUR INTERVALS) --- */}
        <div
          data-tour="simulation-timeline"
          id="tour-simulation-timeline"
          className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3.5 shadow-inner space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>{t('timeline', 'SIMULATION TIMELINE')}</span>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-200 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              T+{String(elapsedHours).padStart(2, '0')}h
            </span>
          </div>

          {/* Prominent Elapsed Time Display */}
          <div className="rounded-lg bg-slate-950/90 border border-slate-800 p-3 text-center shadow-md">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-0.5">
              {t('forecastTimelineInterval', 'Forecast Timeline Interval')}
            </div>
            <div className="text-xl font-black font-mono text-white tracking-wide">
              {t('elapsedTime', 'Elapsed Time')}: +{elapsedHours} Hours
            </div>
            <div className="text-[11px] text-cyan-400/90 mt-0.5 font-medium">
              {t('stepBasedForecast', 'Step-based 6-hour hydrological forecast')}
            </div>
          </div>

          {/* Intuitive Step Buttons: [-] -6h, [+] +6h, Reset to 0h */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={stepBackward6Hours}
              disabled={elapsedHours <= 0}
              className="h-9 gap-1 text-xs font-bold border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-40"
              title="Step back 6 hours to view previous simulation state"
            >
              <StepBack className="h-4 w-4 text-cyan-400" />
              <span>-6h</span>
            </Button>

            <Button
              size="sm"
              variant="cyan"
              onClick={stepForward6Hours}
              className="h-9 gap-1 text-xs font-bold shadow-lg shadow-cyan-950/60"
              title="Increment clock by 6 hours and run simulation calculations"
            >
              <StepForward className="h-4 w-4" />
              <span>+6h</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={resetToZeroHours}
              className="h-9 gap-1 text-xs font-bold border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
              title="Reset simulation timeline back to 0 hours"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span>Reset 0h</span>
            </Button>
          </div>

          {/* Auto-Run Toggle */}
          <div className="pt-0.5">
            <Button
              size="xs"
              variant={isPlaying ? 'destructive' : 'secondary'}
              onClick={togglePlayPause}
              className="w-full h-7 gap-1.5 text-[11px] font-semibold"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3 fill-current" />
                  <span>{t('pauseAutomated', 'Pause Automated Stepping')}</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current" />
                  <span>{t('autoStepSim', 'Auto-Step Simulation (6h cycle)')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* --- CIVIL DEFENSE RESCUE CAMPS QUICK ACCESS --- */}
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
              <Tent className="h-4 w-4 text-emerald-400" />
              <span>{t('activeCamps', 'Rescue Camps & Logistics')}</span>
            </div>
            <Badge variant="safe" className="text-[10px] font-mono">
              {rescueCamps.length} ACTIVE
            </Badge>
          </div>

          <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">{t('shelteredCitizens', 'Sheltered Citizens')}:</span>
              <strong className="text-emerald-300 font-mono text-sm">{totalShelteredEvacuees.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{t('totalCapacity', 'Total Bed Capacity')}:</span>
              <strong className="text-white font-mono text-sm">{totalRescueCapacity.toLocaleString()}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="cyan"
              onClick={() => {
                setActiveModal('rescue_camps');
                playTacticalAlertSound('action');
              }}
              className="flex-1 h-7 text-[11px] font-bold gap-1"
            >
              <Tent className="h-3 w-3" />
              {t('openRescueCommand', 'Open Rescue Command')}
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                autoDeployRecommendedCamps();
                playTacticalAlertSound('action');
              }}
              className="h-7 text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50"
              title="Automatically deploy top algorithmically recommended camps"
            >
              <Sparkles className="h-3 w-3 mr-1 text-amber-400" />
              {t('autoDeploy', 'Auto-Deploy')}
            </Button>
          </div>
        </div>

        {/* --- SECTION 2 (TOUR STEP 2): RAINFALL INTENSITY (CATCHMENT AREA) --- */}
        <div
          data-tour="rainfall-slider"
          id="tour-rainfall-slider"
          className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <CloudRain className="h-4 w-4 text-cyan-400" />
              <span>{t('rainfallIntensity', 'Rainfall Intensity (Catchment Area)')}</span>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {rainfall} mm/h
            </span>
          </div>

          {/* Subtitle / Plain Language Description */}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t('rainDesc', 'How heavy the rain is falling over the city and surrounding hills. Higher rain fills drains faster and causes water to pool in low-lying neighborhoods.')}
          </p>

          <Slider
            min={0}
            max={200}
            step={2}
            value={rainfall}
            onValueChange={(val) => setRainfallIntensity(val)}
            accentColor={rainfall > 80 ? 'rose' : rainfall > 40 ? 'amber' : 'cyan'}
          />

          {/* Plain-English Tag Indicator */}
          <div className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between ${rainInfo.colorClass}`}>
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>{rainInfo.tag}</span>
            </span>
            <span className="font-mono text-[10px] opacity-80">{rainfall} mm/h</span>
          </div>

          {/* Hill Rainfall Indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>{t('hillRainfall', 'Hill Rainfall')}:</span>
            <span className={`font-mono font-medium ${rainfall > 60 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
              {rainfall > 60 ? t('khasiHillsRunoff', '+25% runoff from Khasi Hills') : t('normalHillRunoff', 'Normal hill runoff')}
            </span>
          </div>
        </div>

        {/* --- SECTION 3 (TOUR STEP 3): GMDA PUMPS & SLUICE GATE CONTROLS (CITY DEFENSES) --- */}
        <div
          data-tour="city-defenses"
          id="tour-city-defenses"
          className="space-y-3.5 rounded-2xl border border-blue-500/40 bg-slate-900/40 p-3.5 shadow-lg shadow-blue-950/30"
        >
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-cyan-400" />
              <span>{t('controlsAndPumps', 'City Defenses & Drainage Controls')}</span>
            </div>
            <Badge variant="cyan" className="text-[9px] font-mono">
              PUMPS & SLUICE
            </Badge>
          </div>

          {/* 1. 20 GMDA Auto-Priming Pumps Hardware Controller */}
          <div className="space-y-2.5 rounded-xl border border-blue-500/30 bg-blue-950/20 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 uppercase tracking-wider">
                <Cpu className="h-4 w-4 text-blue-400" />
                <span>{t('pumpsFleet', '20 GMDA Auto-Priming Pumps')}</span>
              </div>
              <Badge variant={activePumps === 20 ? 'safe' : activePumps > 0 ? 'warning' : 'critical'} className="text-[10px] font-mono">
                {activePumps}/20 {activePumps > 0 ? t('pumpsRunning', 'RUNNING') : t('pumpsOffline', 'OFFLINE')}
              </Badge>
            </div>

            <p className="text-[11px] text-slate-300 leading-tight">
              High-power drainage pumps stationed at flood-prone neighborhoods: Anil Nagar, Nabin Nagar, Rukminigaon, and Tarun Nagar.
            </p>

            {/* Master Pump Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                size="xs"
                variant={allPumpsActive ? 'default' : 'cyan'}
                onClick={() => setAllGMDAPumpsState(!allPumpsActive)}
                className="text-[11px] h-7"
              >
                <Power className="h-3 w-3 mr-1" />
                {allPumpsActive ? t('turnOffAll', 'Turn Off All') : t('turnOnAllPumps', 'Turn On All 20 Pumps')}
              </Button>

              <Button
                size="xs"
                variant="destructive"
                onClick={() => {
                  simulateGMDAPumpsFailure();
                  playTacticalAlertSound('critical');
                }}
                className="text-[11px] h-7 bg-rose-950 hover:bg-rose-900 border border-rose-600/50"
                title="Simulate electrical power failure across all GMDA dewatering pumps"
              >
                <AlertOctagon className="h-3 w-3 mr-1 text-rose-400" />
                {t('powerOutage', 'Simulate Power Outage')}
              </Button>
            </div>

            {/* Expandable Individual Pump Station List */}
            <div className="pt-1">
              <button
                onClick={() => setPumpsExpanded(!pumpsExpanded)}
                className="w-full text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center justify-between py-1 border-t border-blue-900/40"
              >
                <span>{pumpsExpanded ? t('hideIndividual', 'Hide individual stations') : t('configureStations', 'Configure individual 20 pump stations')}</span>
                <span className="font-mono text-[10px]">{pumpsExpanded ? '▲' : '▼'}</span>
              </button>

              {pumpsExpanded && (
                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {gmdaPumps.map((pump) => {
                    const isActive = activePumpIds.has(pump.id);
                    return (
                      <div
                        key={pump.id}
                        className="flex items-center justify-between rounded bg-slate-900/80 p-2 border border-slate-800 text-[11px]"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{pump.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {pump.capacityM3Hr} m³/hr • {pump.channelDischarge}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleGMDAPump(pump.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950/50 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {isActive ? 'RUNNING' : 'STOPPED'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. Main River Flood Gate (Bharalumukh Sluice) */}
          <div className="space-y-3 rounded-xl border border-cyan-500/30 bg-slate-900/50 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Waves className="h-4 w-4 text-cyan-400" />
                {t('riverBarrier', 'Main River Flood Gate (Bharalumukh Sluice)')}
              </span>
            </div>

            {/* Plain-English Explanation Note */}
            <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-2.5 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-200">
                This gate stops the swollen Brahmaputra river from flowing backward into the city&apos;s drainage channels:
              </p>
              <ul className="space-y-1 text-slate-300 pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>
                    When the river rises higher than city drains, closing this gate stops river water from flooding the city, but also traps internal rainwater inside unless pumped out.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    <strong className="text-emerald-300">Gate OPEN:</strong> {t('gateOpenDesc', 'Rainwater drains naturally into the river by gravity (only works when the river is lower than city drains).')}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>
                    <strong className="text-amber-300">Gate CLOSED:</strong> {t('gateClosedDesc', 'Blocks river backflow, but city rainwater cannot exit naturally and relies on emergency pumps.')}
                  </span>
                </li>
              </ul>
            </div>

            {/* Clear State A / State B Toggle Switch */}
            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">River Barrier Status</span>
                <Badge
                  variant={config.sluiceGateOpen ? 'safe' : 'critical'}
                  className="text-[10px]"
                >
                  {config.sluiceGateOpen ? 'NATURAL DRAINAGE' : 'BARRIER ACTIVE'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => setBrahmaputraSluiceGate(!config.sluiceGateOpen)}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${
                    config.sluiceGateOpen
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-md shadow-emerald-950/30'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-300 hover:bg-rose-900/50 shadow-md shadow-rose-950/30'
                  }`}
                >
                  <span className="text-left">
                    {config.sluiceGateOpen
                      ? 'State A: Gate Open (Natural Drainage)'
                      : 'State B: Gate Closed (Brahmaputra Rising / River Barrier Active)'}
                  </span>
                  <span className="text-[10px] font-mono underline ml-1 shrink-0">
                    {config.sluiceGateOpen ? 'Click to Close' : 'Click to Open'}
                  </span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                <span>Brahmaputra River Water Level:</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {config.brahmaputraFloodStageMeters || 48.2}m (Danger Mark: 50.5m)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- SECTION 5: GUWAHATI FLOOD SCENARIOS --- */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              Guwahati Flood Scenarios
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">GMDA BASIN</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {PRESET_SCENARIOS.map((preset) => {
              const isActive = activeScenarioId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    loadScenario(preset.id);
                    playTacticalAlertSound('action');
                  }}
                  className={`flex flex-col text-left rounded-lg p-2.5 transition-all border ${
                    isActive
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-2">
                      {scenarioIcons[preset.iconName]}
                      <span className={`text-xs font-bold ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {preset.name}
                      </span>
                    </div>
                    <Badge
                      size="xs"
                      variant={
                        preset.badge.includes('PUMPS DOWN') || preset.badge.includes('BARRIER')
                          ? 'critical'
                          : preset.badge.includes('HILL RAIN')
                          ? 'warning'
                          : 'default'
                      }
                      className="text-[9px]"
                    >
                      {preset.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-400">
                    <span>Rain: <strong className="text-slate-200">{preset.rainfallIntensity} mm/h</strong></span>
                    <span>Pumps: <strong className="text-slate-200">{preset.pumpsOffline ? '0/20 (OFFLINE)' : '20/20 Running'}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- SECTION 6: SIMULATE EMERGENCIES (FAULT INJECTION) --- */}
        <div className="space-y-2.5 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              Simulate Emergencies
            </h3>
            <span className="text-[9px] font-mono font-semibold text-rose-400 uppercase bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800/60">
              TRIGGER EVENT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* GMDA 20 Pumps Power Outage */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                injectDisaster('GMDA_PUMP_GRID_BLACKOUT');
                playTacticalAlertSound('critical');
              }}
              className="flex-col h-auto py-2.5 px-2 items-start text-left bg-rose-950/80 hover:bg-rose-900/90 border border-rose-600/50 text-white"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-200 mb-0.5">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>20 Pumps Power Outage</span>
              </div>
              <span className="text-[10px] text-rose-300/80 font-normal leading-tight">
                Simulate pump power cut
              </span>
            </Button>

            {/* Brahmaputra Sluice Lock Backflow */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                injectDisaster('BRAHMAPUTRA_SLUICE_BACKFLOW');
                playTacticalAlertSound('critical');
              }}
              className="flex-col h-auto py-2.5 px-2 items-start text-left bg-blue-950/70 hover:bg-blue-900/90 border border-blue-600/50 text-white"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-blue-200 mb-0.5">
                <Waves className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>River Backflow Barrier</span>
              </div>
              <span className="text-[10px] text-blue-300/80 font-normal leading-tight">
                Flood gate closed as river rises
              </span>
            </Button>

            {/* Zoo Road Culvert Choke */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                injectDisaster('CHANNEL_BLOCKAGE');
                playTacticalAlertSound('warning');
              }}
              className="flex-col h-auto py-2.5 px-2 items-start text-left bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-white"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-200 mb-0.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Zoo Rd Drain Blockage</span>
              </div>
              <span className="text-[10px] text-amber-300/80 font-normal leading-tight">
                Drain choked with silt & trash
              </span>
            </Button>

            {/* Khasi Cloudburst Spike */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                injectDisaster('CLOUDBURST_SPIKE');
                playTacticalAlertSound('critical');
              }}
              className="flex-col h-auto py-2.5 px-2 items-start text-left bg-purple-950/60 hover:bg-purple-900/80 border border-purple-600/50 text-white"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-purple-200 mb-0.5">
                <CloudLightning className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>Severe Hill Cloudburst</span>
              </div>
              <span className="text-[10px] text-purple-300/80 font-normal leading-tight">
                Heavy 160 mm/h hill downpour
              </span>
            </Button>
          </div>

          {/* Active Emergencies List */}
          {activeDisasters.length > 0 && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-rose-900/40">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                Active Emergency Events ({activeDisasters.length})
              </div>
              {activeDisasters.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded bg-slate-950/80 p-2 border border-rose-500/30 text-xs"
                >
                  <div>
                    <span className="font-bold text-rose-200 block text-[11px]">{d.title}</span>
                    <span className="text-[10px] text-slate-400">At tick {d.appliedAtTick}</span>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => removeDisaster(d.id)}
                    className="border-rose-500/40 text-rose-300 hover:bg-rose-950 text-[10px]"
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
