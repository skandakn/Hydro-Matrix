/**
 * HYDRO MATRIX: Command Center Header Bar
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - Brand identity with Guwahati Bahini/Bharalu crisis command insignia
 * - Subtle UI badge for GMDA GIS-Based Drainage Ecosystem integration & EOI Master Plan
 * - Dynamic Alert Level beacon (Green / Amber / Flashing Crimson)
 * - Mission clock (T+HH:MM:SS) and tick indicator
 * - Modal action launchers: GMDA Info, Scenario Comparison, Evacuation Dispatch, SitRep
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
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
  Info,
  Building2,
  LogIn,
  PhoneCall,
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
                HYDRO<span className="text-cyan-400"> MATRIX</span>
              </span>
              <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                GUWAHATI
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400">
              Bahini / Bharalu Basin • Real-Time Crisis Operations
            </p>
          </div>
        </div>

        {/* Subtle GMDA GIS Drainage Ecosystem Badge */}
        <button
          onClick={() => {
            setActiveModal('gmda_info');
            playTacticalAlertSound('action');
          }}
          className="hidden xl:flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[10px] font-medium text-cyan-300 transition-all hover:bg-cyan-900/50 hover:border-cyan-400 group cursor-pointer"
          title="Click to view GMDA GIS Drainage Ecosystem & EOI DPR Master Plan Details"
        >
          <Building2 className="h-3 w-3 text-cyan-400" />
          <span>GMDA GIS Drainage Ecosystem</span>
          <span className="text-slate-500 font-mono">|</span>
          <span className="text-slate-400 group-hover:text-cyan-200">EOI Master Plan</span>
          <Info className="h-3 w-3 text-cyan-400 ml-0.5" />
        </button>

        {/* Dynamic Threat Beacon */}
        <div className="hidden lg:flex items-center gap-2 ml-2 pl-3 border-l border-slate-800">
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
        {/* GMDA Info Modal trigger (mobile/compact icon) */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('gmda_info');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs xl:hidden border-cyan-500/40 text-cyan-300"
          title="GMDA Drainage Master Plan & EOI DPR Info"
        >
          <Building2 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="hidden sm:inline">GMDA Info</span>
        </Button>

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

        {/* Emergency Voice Helpline Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('emergency_helpline');
            playTacticalAlertSound('critical');
          }}
          className="gap-1.5 text-xs border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:border-rose-400 shadow-sm shadow-rose-950/40"
          title="Open AI Emergency Voice Helpline & Telephony Dispatch"
        >
          <PhoneCall className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
          <span>Emergency Helpline</span>
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
          <span>SitRep</span>
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

        {/* Operator Authentication Control */}
        <div className="flex items-center pl-2 ml-1 border-l border-slate-800">
          <SignedIn>
            <div className="flex items-center gap-2">
              <span className="hidden xl:inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OP-ACTIVE
              </span>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-7 w-7 ring-2 ring-cyan-500/50 hover:ring-cyan-400 transition-all cursor-pointer",
                    userButtonPopoverCard: "bg-slate-900 border border-slate-800 shadow-2xl text-slate-100",
                    userButtonPopoverActionButtonText: "text-slate-200 text-xs",
                    userButtonPopoverActionButtonIcon: "text-cyan-400",
                    userButtonPopoverFooter: "hidden",
                  },
                }}
              />
            </div>
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 hover:text-white transition-all shadow-sm shadow-cyan-500/20 group"
              title="Operator Sign In"
            >
              <LogIn className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Operator Sign In</span>
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>

  );
};
