/**
 * FLOWSHIELD: Left Drawer (Scenario & Control Panel)
 * 
 * Features:
 * - Rainfall intensity configuration slider with dynamic meteorological gauge
 * - Predefined scenario preset toggles (Normal Monsoon, 100-Year Cloudburst, etc.)
 * - High-stakes disaster injection buttons:
 *   - "Model drainage failure" (widespread pump outage)
 *   - "Simulate a blocked drainage channel" (canal choke debris dam)
 *   - "Trigger Cloudburst Spike"
 * - Interactive time slider for scrub-back and forward flood visualization
 * - Play / Pause / Step Controls / Speed Multipliers
 */

'use client';

import React from 'react';
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
  Wrench,
  Gauge,
  Clock,
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
    togglePlayPause,
    stepForward,
    stepBackward,
    jumpToTick,
    setPlaybackSpeed,
    setRainfallIntensity,
    setDrainageEfficiency,
    setCriticalThreshold,
    loadScenario,
    resetSimulation,
    injectDisaster,
    removeDisaster,
  } = useFloodSimulation();

  const { isLeftDrawerOpen, setIsLeftDrawerOpen, playTacticalAlertSound } = useUIContext();

  if (!isLeftDrawerOpen) {
    return (
      <button
        onClick={() => setIsLeftDrawerOpen(true)}
        className="absolute top-16 left-0 z-30 flex items-center gap-2 rounded-r-lg border border-l-0 border-cyan-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-transform hover:translate-x-1"
        title="Open Scenario & Control Panel"
      >
        <Sliders className="h-4 w-4 text-cyan-400" />
        <span>SCENARIO CONTROLS</span>
      </button>
    );
  }

  // Rainfall classification label
  const getRainfallLabel = (mm: number) => {
    if (mm <= 5) return { label: 'Light Drizzle', color: 'text-slate-400' };
    if (mm <= 25) return { label: 'Moderate Rain', color: 'text-blue-400' };
    if (mm <= 60) return { label: 'Heavy Downpour', color: 'text-cyan-400' };
    if (mm <= 120) return { label: 'Severe Torrential', color: 'text-amber-400 font-bold' };
    return { label: 'Catastrophic Cloudburst', color: 'text-rose-400 font-bold animate-pulse' };
  };

  const rainInfo = getRainfallLabel(config.rainfallIntensity);

  const scenarioIcons: Record<string, React.ReactNode> = {
    CloudRain: <CloudRain className="h-4 w-4 text-blue-400" />,
    CloudLightning: <CloudLightning className="h-4 w-4 text-amber-400" />,
    AlertOctagon: <AlertOctagon className="h-4 w-4 text-rose-400" />,
    ShieldAlert: <ShieldAlert className="h-4 w-4 text-orange-400" />,
    Waves: <Waves className="h-4 w-4 text-cyan-400" />,
  };

  return (
    <aside className="relative z-30 flex flex-col w-84 md:w-96 h-full max-h-screen border-r border-slate-800/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-y-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-slate-100">
            Scenario & Controls
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

          {/* Interactive Time Slider (Bidirectional Scrubbing) */}
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

          {/* Playback Button Row */}
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
                title="Step Forward (Compute Tick)"
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

            {/* Playback speed selector */}
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

        {/* --- SECTION 2: METEOROLOGICAL RAINFALL SLIDER --- */}
        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <CloudRain className="h-3.5 w-3.5 text-blue-400" />
              <span>Rainfall Precipitation</span>
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
              {(config.rainfallIntensity * 0.0278).toFixed(2)} mm/tick
            </span>
          </div>
        </div>

        {/* --- SECTION 3: PREDEFINED CRISIS SCENARIO PRESETS --- */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              Predefined Scenarios
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">CALIBRATED</span>
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
                        preset.badge.includes('DISASTER') || preset.badge.includes('CATASTROPHIC')
                          ? 'critical'
                          : preset.badge.includes('EXTREME')
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
                    <span>Drainage: <strong className="text-slate-200">{Math.round(preset.drainageSystemEfficiency * 100)}%</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- SECTION 4: DISASTER INJECTION COMMAND SUITE --- */}
        <div className="space-y-2.5 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              Disaster Injection Suite
            </h3>
            <span className="text-[9px] font-mono font-semibold text-rose-400 uppercase bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800/60">
              LIVE FAULT INJECT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Model drainage failure */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                injectDisaster('DRAINAGE_FAILURE');
                playTacticalAlertSound('critical');
              }}
              className="flex-col h-auto py-2.5 px-2 items-start text-left bg-rose-950/80 hover:bg-rose-900/90 border border-rose-600/50 text-white"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-200 mb-0.5">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>Model Drainage Failure</span>
              </div>
              <span className="text-[10px] text-rose-300/80 font-normal leading-tight">
                Knocks out 80% pump output
              </span>
            </Button>

            {/* Simulate blocked drainage channel */}
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
                <span>Blocked Canal Channel</span>
              </div>
              <span className="text-[10px] text-amber-300/80 font-normal leading-tight">
                Dam & culvert blockage
              </span>
            </Button>

            {/* Cloudburst Spike */}
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
                <span>Cloudburst Spike</span>
              </div>
              <span className="text-[10px] text-purple-300/80 font-normal leading-tight">
                Burst rain to 180 mm/h
              </span>
            </Button>

            {/* Storm Surge Breach */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                injectDisaster('STORM_SURGE_BREACH');
                playTacticalAlertSound('critical');
              }}
              className="flex-col h-auto py-2.5 px-2 items-start text-left bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-600/50 text-white"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-200 mb-0.5">
                <Waves className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Coastal Surge Head</span>
              </div>
              <span className="text-[10px] text-cyan-300/80 font-normal leading-tight">
                +1.4m ocean backwater
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

        {/* --- SECTION 5: ADVANCED HYDRAULIC PARAMETERS --- */}
        <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
              Hydraulic Engine Tuning
            </span>
          </div>

          {/* Drainage System Global Efficiency */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Stormwater Pump Output:</span>
              <span className="font-mono text-emerald-400">
                {Math.round(config.drainageSystemEfficiency * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={config.drainageSystemEfficiency}
              onValueChange={(val) => setDrainageEfficiency(val)}
              accentColor="emerald"
            />
          </div>

          {/* Critical Threshold */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Critical Water Depth Threshold:</span>
              <span className="font-mono text-rose-400">{config.criticalThreshold.toFixed(2)}m</span>
            </div>
            <Slider
              min={0.4}
              max={1.5}
              step={0.05}
              value={config.criticalThreshold}
              onValueChange={(val) => setCriticalThreshold(val)}
              accentColor="rose"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
