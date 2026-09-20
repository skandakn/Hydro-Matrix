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

import React, { useState, useRef, useEffect } from 'react';
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
  Tent,
  Globe,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

export const Header: React.FC = () => {
  const {
    currentTick,
    elapsedSeconds,
    criticalZoneCount,
    warningZoneCount,
    activeDisasters,
    generateComparisonBenchmarks,
    rescueCamps,
    totalShelteredEvacuees,
  } = useFloodSimulation();

  const {
    language,
    setLanguage,
    t,
    audioAlertsEnabled,
    toggleAudioAlerts,
    setActiveModal,
    playTacticalAlertSound,
  } = useUIContext();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              <span className="font-extrabold text-sm md:text-base tracking-wider text-white whitespace-nowrap">
                HYDRO<span className="text-cyan-400">&#8202;MATRIX</span>
              </span>
              <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                GUWAHATI
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400">
              {t('brandSubtitle')}
            </p>
          </div>
        </div>

        {/* Subtle GMDA GIS Drainage Ecosystem Badge */}
        <button
          onClick={() => {
            setActiveModal('gmda_info');
            playTacticalAlertSound('action');
          }}
          className="hidden 2xl:flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[10px] font-medium text-cyan-300 transition-all hover:bg-cyan-900/50 hover:border-cyan-400 group cursor-pointer"
          title="Click to view GMDA GIS Drainage Ecosystem & EOI DPR Master Plan Details"
        >
          <Building2 className="h-3 w-3 text-cyan-400" />
          <span>{t('gmdaEcosystem')}</span>
          <span className="text-slate-500 font-mono">|</span>
          <span className="text-slate-400 group-hover:text-cyan-200">{t('eoiMasterPlan')}</span>
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
              {activeDisasters.length} FAULTS
            </Badge>
          )}
        </div>
      </div>

      {/* Center: Mission Elapsed Time Readout */}
      <div className="hidden sm:flex items-center gap-2 md:gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 md:px-3 py-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] uppercase font-semibold">T-ELAPSED:</span>
        </div>
        <span className="font-mono text-xs md:text-sm font-bold text-white tracking-wider">
          T+{formatTime(elapsedSeconds)}
        </span>
        <div className="hidden md:block text-[10px] text-slate-500 font-mono pl-2 border-l border-slate-800">
          TICK #{currentTick}
        </div>
      </div>

      {/* Right: Command Actions & Tooling */}
      <div className="flex items-center gap-1 md:gap-1.5">
        {/* GMDA Info Modal trigger */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('gmda_info');
            playTacticalAlertSound('action');
          }}
          className="gap-1 text-xs 2xl:hidden border-cyan-500/40 text-cyan-300 px-2 sm:px-2.5"
          title="GMDA Drainage Master Plan & EOI DPR Info"
        >
          <Building2 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="hidden xl:inline">{t('gmdaInfo')}</span>
        </Button>

        {/* Multilingual Selector Dropdown */}
        <div className="relative" ref={langMenuRef}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="gap-1.5 text-xs border-cyan-500/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/60 hover:border-cyan-400 shadow-sm shadow-cyan-500/20 font-medium px-2 sm:px-2.5"
            title="Switch Language: English / অসমীয়া / हिन्दी / বাংলা"
          >
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-bold">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}</span>
            <span className="hidden md:inline font-semibold">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName}</span>
          </Button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-700 bg-slate-950/98 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-semibold border-b border-slate-800 mb-1 flex items-center justify-between">
                <span>{t('language')} / ভাষা</span>
                <span className="text-cyan-400 text-[9px]">4 ACTIVE</span>
              </div>
              {SUPPORTED_LANGUAGES.map((langOpt) => (
                <button
                  key={langOpt.code}
                  type="button"
                  onClick={() => {
                    setLanguage(langOpt.code);
                    setLangMenuOpen(false);
                    playTacticalAlertSound('action');
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                    language === langOpt.code
                      ? 'bg-cyan-950/90 text-cyan-300 font-bold border border-cyan-500/50'
                      : 'text-slate-200 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{langOpt.flag}</span>
                    <span className="font-medium">{langOpt.nativeName}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{langOpt.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scenario Comparison View Button */}
        <Button
          size="sm"
          variant="cyan"
          onClick={() => {
            generateComparisonBenchmarks();
            setActiveModal('comparison');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs px-2 sm:px-2.5"
          title={t('compareScenarios')}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">{t('compareScenarios')}</span>
        </Button>

        {/* Rescue Camps Intelligence & Staging Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('rescue_camps');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs border-emerald-500/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400 shadow-sm shadow-emerald-950/40 group px-2 sm:px-2.5"
          title={t('rescueCamps')}
        >
          <Tent className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold hidden md:inline">{t('rescueCamps')}</span>
          <span className="rounded bg-emerald-950/90 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
            {rescueCamps.length} <span className="hidden sm:inline">({totalShelteredEvacuees.toLocaleString()})</span>
          </span>
        </Button>

        {/* Evacuation Advisor Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('evacuation');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-950/40 px-2 sm:px-2.5"
          title={t('evacAdvisor')}
        >
          <Users className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden 2xl:inline">{t('evacAdvisor')}</span>
        </Button>

        {/* Incident SitRep Export Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveModal('export_report');
            playTacticalAlertSound('action');
          }}
          className="gap-1.5 text-xs border-slate-700 text-slate-300 hover:text-white px-2 sm:px-2.5"
          title={t('sitRep')}
        >
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden 2xl:inline">{t('sitRep')}</span>
        </Button>

        {/* Tactical Sound Siren Toggle */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-slate-400 hover:text-white shrink-0"
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
        <div className="flex items-center pl-1.5 sm:pl-2 ml-0.5 border-l border-slate-800 shrink-0">
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
              <span className="hidden md:inline">{t('operatorSignIn')}</span>
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>

  );
};
