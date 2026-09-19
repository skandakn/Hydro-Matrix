/**
 * FLOWSHIELD: Command Center Header Bar
 * 
 * Features:
 * - Brand identity with crisis command insignia
 * - Dynamic Alert Level beacon (Green / Amber / Flashing Crimson)
 * - Simulation time elapsed clock (T+HH:MM:SS) and tick indicator
 * - Modal action launchers: Scenario Comparison, Evacuation Dispatch, SitRep Report
 * - Tactical audio alarm mute/unmute toggle
 */

'use client';

import React from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  BarChart3,
  FileText,
  Volume2,
  VolumeX,
  Clock,
  Users,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

export const Header: React.FC = () => {
  const {
    currentTick,
    elapsedSeconds,
    criticalZoneCount,
    warningZoneCount,
    activeDisasters,
    generateComparisonBenchmarks,
  } = useFloodSimulation();

  const {
    audioAlertsEnabled,
    toggleAudioAlerts,
    setActiveModal,
    playTacticalAlertSound,
  } = useUIContext();

  // Dynamic Threat Classification Status
  const getCrisisStatus = () => {
    if (criticalZoneCount > 0) {
      return {
        label: 'DEFCON 1: CRITICAL INUNDATION',
        badgeVariant: 'critical' as const,
        dotColor: 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-ping',
      };
    }
    if (warningZoneCount > 0) {
      return {
        label: 'ALERT LEVEL 2: SURFACE PONDING',
        badgeVariant: 'warning' as const,
        dotColor: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
      };
    }
    return {
      label: 'STATUS NORMAL: RUNOFF CLEAR',
      badgeVariant: 'safe' as const,
      dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
    };
  };

  const status = getCrisisStatus();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-xl shadow-lg">
      {/* Brand & Incident Beacon */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/40 shadow-md shadow-cyan-500/20">
            <ShieldAlert className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm md:text-base tracking-wider text-white">
                FLOW<span className="text-cyan-400">SHIELD</span>
              </span>
              <span className="hidden sm:inline-block rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                v2.5 EARLY WARNING
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400">
              Flood Simulation & Crisis Command Operations Center
            </p>
          </div>
        </div>

        {/* Dynamic Threat Beacon */}
        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
          <span className={`h-2.5 w-2.5 rounded-full ${status.dotColor}`} />
          <Badge variant={status.badgeVariant} className="text-[10px] tracking-wider font-mono">
            {status.label}
          </Badge>
          {activeDisasters.length > 0 && (
            <Badge variant="critical" className="text-[9px] font-mono">
              {activeDisasters.length} FAULTS INJECTED
            </Badge>
          )}
        </div>
      </div>

      {/* Center: Mission Elapsed Time Readout */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] uppercase font-semibold">T-ELAPSED:</span>
        </div>
        <span className="font-mono text-sm font-bold text-white tracking-wider">
          T+{formatTime(elapsedSeconds)}
        </span>
        <div className="hidden sm:block text-[10px] text-slate-500 font-mono pl-2 border-l border-slate-800">
          TICK #{currentTick}
        </div>
      </div>

      {/* Right: Command Actions & Tooling */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Scenario Comparison View Button */}
        <Button
          size="sm"
          variant="cyan"
          onClick={() => {
            generateComparisonBenchmarks();
            setActiveModal('comparison');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs hidden sm:inline-flex"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Compare Scenarios</span>
        </Button>

        {/* Evacuation Advisor Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('evacuation');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs hidden md:inline-flex border-amber-500/30 text-amber-300 hover:bg-amber-950/40"
        >
          <Users className="h-3.5 w-3.5 text-amber-400" />
          <span>Evac Advisor</span>
        </Button>

        {/* Incident SitRep Export Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('export_report');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs hidden lg:inline-flex border-slate-700 text-slate-300"
        >
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span>SitRep Report</span>
        </Button>

        {/* Tactical Sound Siren Toggle */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-slate-400 hover:text-white"
          onClick={toggleAudioAlerts}
          title={audioAlertsEnabled ? 'Disable Tactical Siren Audio' : 'Enable Tactical Siren Audio'}
        >
          {audioAlertsEnabled ? (
            <Volume2 className="h-4 w-4 text-cyan-400" />
          ) : (
            <VolumeX className="h-4 w-4 text-slate-500" />
          )}
        </Button>
      </div>
    </header>
  );
};
