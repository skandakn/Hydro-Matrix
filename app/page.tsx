/**
 * HYDRO MATRIX: Flood Simulation and Early Warning Dashboard
 * Primary Crisis Command Center Page Layout
 * Localization: Guwahati — Bahini/Bharalu Basin
 *
 * Architecture & Coordination:
 * - Master Physics Loop Driver: Dispatches tick-based physics steps via interval
 *   scaled dynamically by playback speed (1x, 2x, 5x, 10x).
 * - Supabase Persistence: Session lifecycle, telemetry batching, benchmark caching
 * - Multi-Drawer Responsive Layout:
 *   - Left: Scenario Configurator, Rainfall Modulation, 20 GMDA Pumps & Disaster Injection Suite
 *   - Center: 2.5D Isometric & 2D Top-Down Interactive Geospatial Viewport with 5 Primary Channels
 *   - Right: Telemetry & Analytics, 18 AWS Real-time Feed, and Recharts Progression Curves
 * - Modal Overlays: GMDA Info Narrative, Scenario Comparison Matrix, Evacuation Advisor, SitRep
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { Header } from '@/components/dashboard/Header';
import { LeftDrawer } from '@/components/dashboard/LeftDrawer';
import { RightDrawer } from '@/components/dashboard/RightDrawer';
import { FloodMap2D5 } from '@/components/map/FloodMap2D5';
import { ComparisonModal } from '@/components/dashboard/ComparisonModal';
import { EvacuationAdvisor } from '@/components/dashboard/EvacuationAdvisor';
import { SitRepModal } from '@/components/dashboard/SitRepModal';
import { GMDAInfoModal } from '@/components/dashboard/GMDAInfoModal';
import { EmergencyVoiceHelplineModal } from '@/components/dashboard/EmergencyVoiceHelplineModal';
import { RescueCampModal } from '@/components/dashboard/RescueCampModal';
import { MessageCircle, X } from 'lucide-react';

export default function CrisisCommandPage() {
  const {
    isPlaying,
    playbackSpeed,
    runSimulationStep,
    criticalZoneCount,
    generateComparisonBenchmarks,
  } = useFloodSimulation();

  const { playTacticalAlertSound, setActiveModal, activeModal } = useUIContext();
  const { startSession, recordTelemetryTick, flushSession, saveBenchmarks } =
    useSessionPersistence();

  const prevCritCountRef = useRef<number>(criticalZoneCount);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // ── On mount: start DB session + pre-compute benchmarks ──────────────────
  useEffect(() => {
    startSession();
    generateComparisonBenchmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save benchmarks after they are computed ───────────────────────────────
  useEffect(() => {
    saveBenchmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once after mount; benchmarks are generated synchronously above

  // ── Flush session to DB when simulation pauses ────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      flushSession();
    }
  }, [isPlaying, flushSession]);

  // ── Sound tactical sirens when new critical zones breach threshold ─────────
  useEffect(() => {
    if (criticalZoneCount > prevCritCountRef.current) {
      playTacticalAlertSound('critical');
    }
    prevCritCountRef.current = criticalZoneCount;
  }, [criticalZoneCount, playTacticalAlertSound]);

  /**
   * High-Precision Physics Clock Loop:
   * Drives discrete time evolution of Cellular Automata & 2D diffusive wave equations.
   * Runs runSimulationStep() scaled dynamically by playback speed (1x, 2x, 5x, 10x).
   * Persists a telemetry point to Supabase every 5 ticks.
   */
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(80, Math.round(800 / playbackSpeed));

    const timer = setInterval(() => {
      runSimulationStep();
      const tick = useFloodSimulation.getState().currentTick;
      recordTelemetryTick(tick);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, runSimulationStep, recordTelemetryTick]);

  return (
    <main className="relative flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 1. Global Command Header Bar */}
      <Header />

      {/* 2. Main Operative Body (Left Drawer, Interactive Viewport, Right Drawer) */}
      <div className="relative flex flex-1 h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        {/* Left Drawer: Scenario Selector, 20 GMDA Pumps & Hydraulic Controls */}
        <LeftDrawer />

        {/* Central Viewport: 2.5D Volumetric Grid Canvas */}
        <div className="relative flex flex-1 h-full w-full overflow-hidden bg-slate-950">
          <FloodMap2D5 />
        </div>

        {/* Right Drawer: Live Telemetry, 18 AWS Sensor Feeds & Critical Watchlist */}
        <RightDrawer />
      </div>

      {/* 3. Modal Overlays */}
      <GMDAInfoModal />
      <ComparisonModal />
      <EvacuationAdvisor />
      <SitRepModal />
      <EmergencyVoiceHelplineModal />
      <RescueCampModal />

      {/* 4. Matrix Assistant — Floating Chatbot FAB (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Tooltip label — visible on hover */}
        <div
          className={`transition-all duration-200 ${
            activeModal === 'emergency_helpline'
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100'
          }`}
        >
          <button
            onClick={() => {
              setActiveModal('emergency_helpline');
              playTacticalAlertSound('critical');
            }}
            className="group flex items-center gap-2.5 rounded-2xl border border-rose-500/60 bg-slate-950/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-rose-950/60 hover:border-rose-400 hover:bg-rose-950/30 transition-all duration-200 hover:scale-105 active:scale-95"
            title="Open Matrix Assistant"
          >
            {/* Pulsing indicator dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>

            {/* Icon */}
            <MessageCircle className="h-5 w-5 text-rose-400 group-hover:text-rose-300 transition-colors shrink-0" />

            {/* Label */}
            <div className="flex flex-col items-start leading-none">
              <span className="text-[11px] font-black tracking-widest text-white uppercase">
                Matrix
              </span>
              <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                Assistant
              </span>
            </div>
          </button>
        </div>

        {/* Close / minimise button — only visible when modal is open */}
        {activeModal === 'emergency_helpline' && (
          <button
            onClick={() => setActiveModal('none')}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 backdrop-blur-xl px-3 py-2.5 shadow-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-150 text-xs font-semibold"
            title="Close Matrix Assistant"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        )}
      </div>
    </main>
  );
}
