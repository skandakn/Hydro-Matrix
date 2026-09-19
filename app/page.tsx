/**
 * HYDRO MATRIX: Flood Simulation and Early Warning Dashboard
 * Primary Crisis Command Center Page Layout
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Architecture & Coordination:
 * - Master Physics Loop Driver: Dispatches tick-based physics steps via requestAnimationFrame / interval
 *   scaled dynamically by playback speed (1x, 2x, 5x, 10x).
 * - Multi-Drawer Responsive Layout:
 *   - Left: Scenario Configurator, Rainfall Modulation, 20 GMDA Pumps & Disaster Injection Suite
 *   - Center: 2.5D Isometric & 2D Top-Down Interactive Geospatial Viewport with 5 Primary Channels
 *   - Right: Telemetry & Analytics, 18 AWS Real-time Feed, and Recharts Progression Curves
 * - Modal Overlays: GMDA Info Narrative, Scenario Comparison Matrix, Evacuation Advisor, Situation Report (SitRep)
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Header } from '@/components/dashboard/Header';
import { LeftDrawer } from '@/components/dashboard/LeftDrawer';
import { RightDrawer } from '@/components/dashboard/RightDrawer';
import { FloodMap2D5 } from '@/components/map/FloodMap2D5';
import { ComparisonModal } from '@/components/dashboard/ComparisonModal';
import { EvacuationAdvisor } from '@/components/dashboard/EvacuationAdvisor';
import { SitRepModal } from '@/components/dashboard/SitRepModal';
import { GMDAInfoModal } from '@/components/dashboard/GMDAInfoModal';

export default function CrisisCommandPage() {
  const {
    isPlaying,
    playbackSpeed,
    stepForward,
    criticalZoneCount,
    generateComparisonBenchmarks,
  } = useFloodSimulation();

  const { playTacticalAlertSound } = useUIContext();

  const prevCritCountRef = useRef<number>(criticalZoneCount);

  // Pre-calculate scenario comparison benchmarks on mount
  useEffect(() => {
    generateComparisonBenchmarks();
  }, [generateComparisonBenchmarks]);

  // Sound tactical sirens when new critical zones breach threshold
  useEffect(() => {
    if (criticalZoneCount > prevCritCountRef.current) {
      playTacticalAlertSound('critical');
    }
    prevCritCountRef.current = criticalZoneCount;
  }, [criticalZoneCount, playTacticalAlertSound]);

  /**
   * High-Precision Physics Clock Loop:
   * Drives discrete time evolution of the 2D shallow water diffusive wave equations.
   * Base rate: 1 tick = 1000ms at 1x speed, scaling up to 100ms at 10x speed.
   */
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(90, Math.round(900 / playbackSpeed));

    const timer = setInterval(() => {
      stepForward();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, stepForward]);

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
    </main>
  );
}
