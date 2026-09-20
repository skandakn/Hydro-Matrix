/**
 * HYDRO MATRIX: UI & Theme Context
 * Manages drawer states, map visualization layers, tactical audio alerts,
 * and command center modal overlays.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MapViewSettings } from '@/types/simulation';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

interface UIContextType {
  // Multilingual Support
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;

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
  activeModal: 'none' | 'comparison' | 'evacuation' | 'export_report' | 'gmda_info' | 'emergency_helpline' | 'rescue_camps';
  setActiveModal: (modal: 'none' | 'comparison' | 'evacuation' | 'export_report' | 'gmda_info' | 'emergency_helpline' | 'rescue_camps') => void;

  // Fullscreen map mode
  isFullscreenMap: boolean;
  toggleFullscreenMap: () => void;

  // Onboarding Guided Tour
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  tourStep: number;
  setTourStep: (step: number) => void;
  startTour: () => void;
  closeTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hydromatrix_lang') as SupportedLanguage | null;
      if (saved && ['en', 'as', 'hi', 'bn'].includes(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('hydromatrix_lang', lang);
    } catch {
      // Ignore localStorage write errors
    }
  }, []);

  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState<'none' | 'comparison' | 'evacuation' | 'export_report' | 'gmda_info' | 'emergency_helpline' | 'rescue_camps'>('none');
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Guided Onboarding Tour State
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

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
    showRescueCamps: true,
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
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

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
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (severity === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Audible two-tone dispatch alert (D5 -> A5)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [audioAlertsEnabled]);

  const t = useCallback((key: string, fallback?: string) => {
    return getTranslation(language, key, fallback);
  }, [language]);

  const startTour = useCallback(() => {
    setActiveModal('none');
    setIsLeftDrawerOpen(true);
    setIsRightDrawerOpen(true);
    setTourStep(0);
    setIsTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem('flowshield_has_seen_tour', 'true');
    } catch {
      // ignore
    }
  }, []);

  const nextTourStep = useCallback(() => {
    setTourStep((prev) => prev + 1);
  }, []);

  const prevTourStep = useCallback(() => {
    setTourStep((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <UIContext.Provider
      value={{
        language,
        setLanguage,
        t,
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
        isTourOpen,
        setIsTourOpen,
        tourStep,
        setTourStep,
        startTour,
        closeTour,
        nextTourStep,
        prevTourStep,
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
