/**
 * HYDRO MATRIX: UI & Theme Context
 * Manages drawer states, map visualization layers, tactical audio alerts,
 * and command center modal overlays.
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { MapViewSettings } from '@/types/simulation';

interface UIContextType {
  // Drawer visibility
  isLeftDrawerOpen: boolean;
  setIsLeftDrawerOpen: (open: boolean) => void;
  toggleLeftDrawer: () => void;
  isRightDrawerOpen: boolean;
  setIsRightDrawerOpen: (open: boolean) => void;
  toggleRightDrawer: () => void;

  // Map view and rendering layers
  mapSettings: MapViewSettings;
  updateMapSettings: (updates: Partial<MapViewSettings>) => void;
  toggleLayer: (layerKey: keyof MapViewSettings) => void;
  setProjection: (proj: '2.5D' | '2D') => void;

  // Audio Alerts
  audioAlertsEnabled: boolean;
  toggleAudioAlerts: () => void;
  playTacticalAlertSound: (severity: 'warning' | 'critical' | 'action') => void;

  // Modals & Panels
  activeModal: 'none' | 'comparison' | 'evacuation' | 'export_report' | 'gmda_info';
  setActiveModal: (modal: 'none' | 'comparison' | 'evacuation' | 'export_report' | 'gmda_info') => void;

  // Fullscreen map mode
  isFullscreenMap: boolean;
  toggleFullscreenMap: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState<'none' | 'comparison' | 'evacuation' | 'export_report' | 'gmda_info'>('none');
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  const [mapSettings, setMapSettings] = useState<MapViewSettings>({
    projection: '2.5D',
    pitch: 52,
    bearing: -22,
    zoom: 1.0,
    showElevationContours: true,
    showWaterDepthHeatmap: true,
    showFlowVectors: true,
    showDrainagePumps: true,
    showPopulationDensity: false,
    showCriticalAlertPulses: true,
    showInfrastructureMarkers: true,
    showPrimaryChannels: true,
    showWeatherStations: true,
    selectedCellId: null,
  });

  const updateMapSettings = useCallback((updates: Partial<MapViewSettings>) => {
    setMapSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleLayer = useCallback((layerKey: keyof MapViewSettings) => {
    setMapSettings(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  }, []);

  const setProjection = useCallback((proj: '2.5D' | '2D') => {
    setMapSettings(prev => ({
      ...prev,
      projection: proj,
      pitch: proj === '2.5D' ? 52 : 0,
      bearing: proj === '2.5D' ? -22 : 0,
    }));
  }, []);

  const toggleLeftDrawer = useCallback(() => setIsLeftDrawerOpen(p => !p), []);
  const toggleRightDrawer = useCallback(() => setIsRightDrawerOpen(p => !p), []);
  const toggleAudioAlerts = useCallback(() => setAudioAlertsEnabled(p => !p), []);
  const toggleFullscreenMap = useCallback(() => setIsFullscreenMap(p => !p), []);

  /**
   * Web Audio API Synthesizer for Tactical Crisis Command Sound Alerts
   */
  const playTacticalAlertSound = useCallback((severity: 'warning' | 'critical' | 'action') => {
    if (!audioAlertsEnabled || typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (severity === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(740, now + 0.1);
        osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (severity === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(980, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [audioAlertsEnabled]);

  return (
    <UIContext.Provider
      value={{
        isLeftDrawerOpen,
        setIsLeftDrawerOpen,
        toggleLeftDrawer,
        isRightDrawerOpen,
        setIsRightDrawerOpen,
        toggleRightDrawer,
        mapSettings,
        updateMapSettings,
        toggleLayer,
        setProjection,
        audioAlertsEnabled,
        toggleAudioAlerts,
        playTacticalAlertSound,
        activeModal,
        setActiveModal,
        isFullscreenMap,
        toggleFullscreenMap,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUIContext() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  return context;
}
