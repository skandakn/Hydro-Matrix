/**
 * FLOWSHIELD: Left Drawer (Scenario & Controls Panel)
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - Interactive toggles for the 20 GMDA auto-priming dewatering pumps
 * - Disaster scenario: "Simulate GMDA 20 Auto-Priming Pump Grid Failure"
 * - Brahmaputra Bharalumukh Sluice Gate controls
 * - Guwahati-calibrated crisis scenarios (Monsoon, Khasi Cloudburst, etc.)
 * - Bidirectional time travel timeline scrubber & playback controls
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
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

export const LeftDrawer: React.FC = () => {
  const {
    currentTick,
    maxRecordedTick,
    elapsedSeconds,
    isPlaying,
    playbackSpeed,
    activeScenarioId,
    config,
    activeDisasters,
    gmdaPumps,
    activePumpIds,
    togglePlayPause,
    stepForward,
    stepBackward,
    jumpToTick,
    setPlaybackSpeed,
    setRainfallIntensity,
    setBrahmaputraSluiceGate,
    toggleGMDAPump,
    setAllGMDAPumpsState,
    simulateGMDAPumpsFailure,
    loadScenario,
    resetSimulation,
    injectDisaster,
    removeDisaster,
  } = useFloodSimulation();

  const { isLeftDrawerOpen, setIsLeftDrawerOpen, playTacticalAlertSound } = useUIContext();

  const [pumpsExpanded, setPumpsExpanded] = useState(false);

  if (!isLeftDrawerOpen) {
    return (
      <button
        onClick={() => setIsLeftDrawerOpen(true)}
        className="absolute top-16 left-0 z-30 flex items-center gap-2 rounded-r-lg border border-l-0 border-cyan-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-transform hover:translate-x-1"
        title="Open Scenario & Control Panel"
      >
        <Sliders className="h-4 w-4 text-cyan-400" />
        <span>CONTROLS & PUMPS</span>
      </button>
    );
  }

  const getRainfallLabel = (mm: number) => {
    if (mm <= 10) return { label: 'Light Monsoon Drizzle', color: 'text-slate-400' };
    if (mm <= 30) return { label: 'Moderate Basin Rainfall', color: 'text-blue-400' };
    if (mm <= 70) return { label: 'Heavy Urban Downpour', color: 'text-cyan-400' };
    if (mm <= 120) return { label: 'Severe Torrential Storm', color: 'text-amber-400 font-bold' };
    return { label: 'Khasi Foothills Cloudburst', color: 'text-rose-400 font-bold animate-pulse' };
  };

  const rainInfo = getRainfallLabel(config.rainfallIntensity);

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
            Guwahati Basin Controls
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-slate-400 hover:text-white"
          onClick={() => setIsLeftDrawerOpen(false)}
          title="Collapse Panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5 text-slate-200">
        {/* --- SECTION 1: TIMELINE & PLAYBACK CONTROLLER --- */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3.5 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>SIMULATION TIMELINE</span>
            </div>
            <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              T+{formatTime(elapsedSeconds)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Scrub Progress:</span>
              <span className="font-mono text-cyan-300">
                Tick {currentTick} / {Math.max(currentTick, maxRecordedTick)}
              </span>
            </div>
            <Slider
              min={0}
              max={Math.max(1, maxRecordedTick)}
              step={1}
              value={currentTick}
              onValueChange={(val) => jumpToTick(val)}
              accentColor="cyan"
            />
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={stepBackward}
                disabled={currentTick <= 0}
                title="Step Backward"
              >
                <StepBack className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant={isPlaying ? 'destructive' : 'default'}
                onClick={togglePlayPause}
                className="gap-1.5 px-3"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>SIMULATE</span>
                  </>
                )}
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={stepForward}
                title="Step Forward"
              >
                <StepForward className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={resetSimulation}
                title="Reset to T+00:00"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-950 p-0.5">
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- SECTION 2: 20 GMDA AUTO-PRIMING PUMPS HARDWARE CONTROLLER --- */}
        <div className="space-y-2.5 rounded-xl border border-blue-500/40 bg-blue-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 uppercase tracking-wider">
              <Cpu className="h-4 w-4 text-blue-400" />
              <span>20 GMDA Auto-Priming Pumps</span>
            </div>
            <Badge variant={activePumpIds.size === 20 ? 'safe' : activePumpIds.size > 0 ? 'warning' : 'critical'} className="text-[10px] font-mono">
              {activePumpIds.size}/20 ARMED
            </Badge>
          </div>

          <p className="text-[11px] text-slate-300 leading-tight">
            High-discharge mobile & fixed dewatering pumps deployed at vulnerable hotspots across Anil Nagar, Nabin Nagar, Rukminigaon, and Tarun Nagar.
          </p>

          {/* Master Pump Grid Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              size="xs"
              variant={allPumpsActive ? 'default' : 'cyan'}
              onClick={() => setAllGMDAPumpsState(!allPumpsActive)}
              className="text-[11px] h-7"
            >
              <Power className="h-3 w-3 mr-1" />
              {allPumpsActive ? 'Stand Down All' : 'Arm All 20 Pumps'}
            </Button>

            <Button
              size="xs"
              variant="destructive"
              onClick={() => {
                simulateGMDAPumpsFailure();
                playTacticalAlertSound('critical');
              }}
              className="text-[11px] h-7 bg-rose-950 hover:bg-rose-900 border border-rose-600/50"
              title="Trigger electrical blackout simulating total GMDA dewatering failure"
            >
              <AlertOctagon className="h-3 w-3 mr-1 text-rose-400" />
              Simulate Pump Failure
            </Button>
          </div>

          {/* Expandable Individual Pump Station List */}
          <div className="pt-1">
            <button
              onClick={() => setPumpsExpanded(!pumpsExpanded)}
              className="w-full text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center justify-between py-1 border-t border-blue-900/40"
            >
              <span>{pumpsExpanded ? 'Hide' : 'Configure individual 20 pump stations'}</span>
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
                        {isActive ? 'ARMED' : 'OFFLINE'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* --- SECTION 3: METEOROLOGICAL RAINFALL SLIDER --- */}
        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <CloudRain className="h-3.5 w-3.5 text-blue-400" />
              <span>Catchment Precipitation</span>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-300">
              {config.rainfallIntensity} mm/h
            </span>
          </div>

          <Slider
            min={0}
            max={200}
            step={2}
            value={config.rainfallIntensity}
            onValueChange={(val) => setRainfallIntensity(val)}
            accentColor={config.rainfallIntensity > 100 ? 'rose' : config.rainfallIntensity > 50 ? 'amber' : 'cyan'}
          />

          <div className="flex items-center justify-between text-[11px]">
            <span className={rainInfo.color}>{rainInfo.label}</span>
            <span className="text-slate-500 font-mono">
              Orographic: {config.rainfallIntensity > 60 ? '+25% Khasi Hills' : 'Normal'}
            </span>
          </div>
        </div>

        {/* --- SECTION 4: PREDEFINED GUWAHATI CRISIS SCENARIOS --- */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              Guwahati Scenarios
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
                        preset.badge.includes('PUMPS DOWN') || preset.badge.includes('BACKFLOW')
                          ? 'critical'
                          : preset.badge.includes('SURGE')
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
                    <span>Pumps: <strong className="text-slate-200">{preset.pumpsOffline ? '0/20 (FAILED)' : '20/20 Active'}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- SECTION 5: DISASTER INJECTION SUITE --- */}
        <div className="space-y-2.5 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              Disaster Injection Suite
            </h3>
            <span className="text-[9px] font-mono font-semibold text-rose-400 uppercase bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800/60">
              LIVE FAULT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* GMDA 20 Pumps Blackout */}
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
                <span>20 Pumps Blackout</span>
              </div>
              <span className="text-[10px] text-rose-300/80 font-normal leading-tight">
                Simulate GMDA pump failure
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
                <span>Brahmaputra Backflow</span>
              </div>
              <span className="text-[10px] text-blue-300/80 font-normal leading-tight">
                Sluice gate closed & locked
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
                <span>Zoo Rd Silt Dam</span>
              </div>
              <span className="text-[10px] text-amber-300/80 font-normal leading-tight">
                Bahini-Bharalu culvert choke
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
                <span>Khasi Cloudburst</span>
              </div>
              <span className="text-[10px] text-purple-300/80 font-normal leading-tight">
                160 mm/h foothill burst
              </span>
            </Button>
          </div>

          {/* Active Disasters List */}
          {activeDisasters.length > 0 && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-rose-900/40">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                Active Injected Faults ({activeDisasters.length})
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

        {/* --- SECTION 6: BHARALUMUKH SLUICE GATE & BRAHMAPUTRA STAGE --- */}
        <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Waves className="h-3.5 w-3.5 text-cyan-400" />
              Bharalumukh Sluice Gate Control
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
            <div>
              <span className="font-bold text-slate-200 block">River Sluice Barrier</span>
              <span className="text-[10px] text-slate-400">
                Brahmaputra Stage: {config.brahmaputraFloodStageMeters || 48.2}m MSL
              </span>
            </div>
            <Button
              size="xs"
              variant={config.sluiceGateOpen ? 'cyan' : 'destructive'}
              onClick={() => setBrahmaputraSluiceGate(!config.sluiceGateOpen)}
              className="text-[11px]"
            >
              {config.sluiceGateOpen ? 'Sluice Open (Discharging)' : 'Sluice Locked (Backflow Def)'}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
