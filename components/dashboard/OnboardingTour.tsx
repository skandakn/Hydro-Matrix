/**
 * FLOWSHIELD GUWAHATI: Interactive First-Time User Onboarding Tour
 * 
 * Features:
 * - 6 Focused tactical onboarding steps covering Command Header, Precipitation Slider,
 *   City Defenses (Pumps & Sluice Gate), 6h Timeline, 2.5D/2D Map Canvas, and Live Telemetry KPIs.
 * - Precision SVG spotlight mask cutout with rgba(0, 0, 0, 0.75) backdrop dimming.
 * - Glowing neon cyan target outline with tactical HUD corner brackets and pulsing radar beacon.
 * - Smart auto-scroll and drawer synchronization (automatically expands Left/Right panels if needed).
 * - Full keyboard navigation (ArrowRight, ArrowLeft, Escape to exit).
 * - Dark-mode cyber command center aesthetic matching FlowShield's visual design.
 * - LocalStorage state persistence under 'flowshield_has_seen_tour'.
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  CloudRain,
  ShieldCheck,
  Clock,
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Tent,
  MessageSquare,
} from 'lucide-react';

export interface TourStepDefinition {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  badge: string;
  placement: 'bottom' | 'right' | 'left' | 'center' | 'top';
  icon: React.ReactNode;
  padding: number;
}

export const TOUR_STEPS: TourStepDefinition[] = [
  {
    id: 'header-title',
    targetSelector: '[data-tour="header-title"]',
    title: 'Welcome to FlowShield Guwahati',
    content: 'This is a real-time crisis command center modeling flood dynamics and early warnings for the Bahini/Bharalu river basin.',
    badge: 'COMMAND HQ',
    placement: 'bottom',
    icon: <ShieldAlert className="h-5 w-5 text-cyan-400" />,
    padding: 8,
  },
  {
    id: 'rainfall-slider',
    targetSelector: '[data-tour="rainfall-slider"]',
    title: 'Control Rainfall Intensity',
    content: 'Simulate storm severity by adjusting rainfall levels across the city and surrounding hills, from manageable showers to extreme cloudbursts.',
    badge: 'METEOROLOGY',
    placement: 'right',
    icon: <CloudRain className="h-5 w-5 text-cyan-400" />,
    padding: 6,
  },
  {
    id: 'city-defenses',
    targetSelector: '[data-tour="city-defenses"]',
    title: 'Manage City Defenses',
    content: 'Test city infrastructure in real time. Deploy 20 auto-priming pumps or toggle the Bharalumukh sluice gate to prevent river backflow into city drains.',
    badge: 'GMDA DEFENSES',
    placement: 'right',
    icon: <ShieldCheck className="h-5 w-5 text-cyan-400" />,
    padding: 6,
  },
  {
    id: 'simulation-timeline',
    targetSelector: '[data-tour="simulation-timeline"]',
    title: 'Step Through Time',
    content: 'Advance time in 6-hour intervals using the [+] and [-] buttons to observe how water accumulates, flows, or recedes across neighborhoods.',
    badge: '6H FORECAST',
    placement: 'right',
    icon: <Clock className="h-5 w-5 text-cyan-400" />,
    padding: 6,
  },
  {
    id: 'map-canvas',
    targetSelector: '[data-tour="map-canvas"]',
    title: 'Tactical Flood Visualizer',
    content: 'Watch the water spread across drainage channels in 3D. Green zones indicate safe areas, yellow signals warning levels, and pulsing crimson flags critical flooding.',
    badge: '3D/2D VIEWPORT',
    placement: 'center',
    icon: <Layers className="h-5 w-5 text-cyan-400" />,
    padding: 4,
  },
  {
    id: 'telemetry-stats',
    targetSelector: '[data-tour="telemetry-stats"]',
    title: 'Real-Time Crisis Analytics',
    content: 'Monitor critical live statistics: submerged basin area, pump discharge rates, and an estimated count of affected residents across low-lying sectors.',
    badge: 'TELEMETRY & IMPACT',
    placement: 'left',
    icon: <Activity className="h-5 w-5 text-cyan-400" />,
    padding: 6,
  },
  {
    id: 'relief-camps',
    targetSelector: '[data-tour="relief-camps"], [data-tour="evac-advisor"]',
    title: 'Disaster Relief & Shelters',
    content: 'Track designated safe shelters across Guwahati in real time. Monitor shelter capacities, occupancy rates, and diversion plans as residents evacuate flooded sectors.',
    badge: 'CIVIL DEFENSE',
    placement: 'bottom',
    icon: <Tent className="h-5 w-5 text-emerald-400" />,
    padding: 6,
  },
  {
    id: 'incident-chatbot',
    targetSelector: '[data-tour="chatbot-trigger"], [data-tour="sitrep-trigger"]',
    title: 'Incident Command Chatbot',
    content: 'Interact directly with an AI emergency assistant to query current water levels, request evacuation route advice, or draft instant municipal situation reports.',
    badge: 'AI COMMAND',
    placement: 'top',
    icon: <MessageSquare className="h-5 w-5 text-rose-400" />,
    padding: 8,
  },
];

export const OnboardingTour: React.FC = () => {
  const {
    isTourOpen,
    tourStep,
    setTourStep,
    closeTour,
    nextTourStep,
    prevTourStep,
    isLeftDrawerOpen,
    setIsLeftDrawerOpen,
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    playTacticalAlertSound,
  } = useUIContext();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const currentStep = TOUR_STEPS[tourStep] || TOUR_STEPS[0];
  const isLastStep = tourStep === TOUR_STEPS.length - 1;

  // ── Sync viewport dimensions ───────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Update target element rect ─────────────────────────────────────────────
  const updateTargetRect = useCallback(() => {
    if (!isTourOpen) return;
    const step = TOUR_STEPS[tourStep];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isTourOpen, tourStep]);

  // ── Handle step transition: drawer synchronization & smooth scrolling ────
  useEffect(() => {
    if (!isTourOpen) {
      setTargetRect(null);
      return;
    }

    // Step 2, 3, 4: Target in Left Drawer
    if (tourStep === 1 || tourStep === 2 || tourStep === 3) {
      if (!isLeftDrawerOpen) {
        setIsLeftDrawerOpen(true);
      }
    }

    // Step 6: Target in Right Drawer
    if (tourStep === 5) {
      if (!isRightDrawerOpen) {
        setIsRightDrawerOpen(true);
      }
    }

    // Step 8: Chatbot FAB in bottom-right (close right drawer on mobile/tablet to prevent obscuring)
    if (tourStep === 7 && viewport.width < 1024 && isRightDrawerOpen) {
      setIsRightDrawerOpen(false);
    }

    // Scroll into view & measure rect after short delay for animations
    const step = TOUR_STEPS[tourStep];
    if (!step) return;

    const scrollAndMeasure = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
        setTargetRect(el.getBoundingClientRect());
      }
    };

    // Measure immediately, then after drawer animation and layout settle
    scrollAndMeasure();
    const timer1 = setTimeout(scrollAndMeasure, 50);
    const timer2 = setTimeout(scrollAndMeasure, 150);
    const timer3 = setTimeout(scrollAndMeasure, 350);
    const timer4 = setTimeout(scrollAndMeasure, 700);

    // Continuous poll for the first 2 seconds until element is found
    const pollInterval = setInterval(() => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        clearInterval(pollInterval);
      }
    }, 100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearInterval(pollInterval);
    };
  }, [
    isTourOpen,
    tourStep,
    isLeftDrawerOpen,
    isRightDrawerOpen,
    setIsLeftDrawerOpen,
    setIsRightDrawerOpen,
    viewport.width,
  ]);

  // ── Listen to window scroll & resize events (including drawer scrolls) ────
  useEffect(() => {
    if (!isTourOpen) return;

    const handleScrollOrResize = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isTourOpen, updateTargetRect]);

  // ── Keyboard Navigation (ArrowRight, ArrowLeft, Escape) ─────────────────────
  useEffect(() => {
    if (!isTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (isLastStep) {
          closeTour();
        } else {
          nextTourStep();
        }
        playTacticalAlertSound('action');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (tourStep > 0) {
          prevTourStep();
          playTacticalAlertSound('action');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTourOpen,
    tourStep,
    isLastStep,
    closeTour,
    nextTourStep,
    prevTourStep,
    playTacticalAlertSound,
  ]);

  if (!isTourOpen) return null;

  // ── Calculate Popover Position with Boundary Protection ───────────────────
  const popoverWidth = Math.min(420, viewport.width - 32);
  const popoverHeight = 280; // Estimated height for safe bounding
  const pad = currentStep.padding || 6;

  let popoverTop = 100;
  let popoverLeft = 100;

  if (targetRect) {
    const isMobile = viewport.width < 768;

    if (isMobile) {
      popoverLeft = (viewport.width - popoverWidth) / 2;
      popoverTop = Math.max(16, viewport.height - popoverHeight - 20);
    } else {
      switch (currentStep.placement) {
        case 'bottom':
          popoverTop = targetRect.bottom + 16;
          popoverLeft = targetRect.right > viewport.width / 2
            ? targetRect.right - popoverWidth
            : targetRect.left;
          break;

        case 'right':
          popoverLeft = targetRect.right + 20;
          popoverTop = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
          // Fall back if overflowing right edge
          if (popoverLeft + popoverWidth > viewport.width - 16) {
            popoverLeft = targetRect.left;
            popoverTop = targetRect.bottom + 16;
          }
          break;

        case 'left':
          popoverLeft = targetRect.left - popoverWidth - 20;
          popoverTop = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
          // Fall back if overflowing left edge
          if (popoverLeft < 16) {
            popoverLeft = targetRect.left;
            popoverTop = targetRect.bottom + 16;
          }
          break;

        case 'top':
          popoverTop = targetRect.top - popoverHeight - 16;
          popoverLeft = targetRect.right > viewport.width / 2
            ? targetRect.right - popoverWidth
            : targetRect.left;
          // Fall back if overflowing top edge
          if (popoverTop < 16) {
            popoverTop = targetRect.bottom + 16;
          }
          break;

        case 'center':
        default:
          popoverLeft = (viewport.width - popoverWidth) / 2;
          popoverTop = Math.max(80, (viewport.height - popoverHeight) / 2);
          break;
      }
    }
  } else {
    // If element is not yet found, center the popover
    popoverLeft = (viewport.width - popoverWidth) / 2;
    popoverTop = (viewport.height - popoverHeight) / 2;
  }

  // Final viewport boundary clamping
  const clampedLeft = Math.max(16, Math.min(viewport.width - popoverWidth - 16, popoverLeft));
  const clampedTop = Math.max(16, Math.min(viewport.height - popoverHeight - 16, popoverTop));

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* ── 1. Semi-Transparent Dimming Backdrop with SVG Mask Cutout ──────── */}
      <svg
        className="fixed inset-0 h-full w-full pointer-events-none transition-opacity duration-300"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="flowshield-spotlight-mask">
            {/* White: visible backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black: transparent spotlight cutout */}
            {targetRect && (
              <rect
                x={targetRect.left - pad}
                y={targetRect.top - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#flowshield-spotlight-mask)"
        />
      </svg>

      {/* ── 2. Glowing Target Outline with Tactical HUD Corner Brackets ────── */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out border-2 border-cyan-400 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.55),inset_0_0_15px_rgba(6,182,212,0.2)]"
          style={{
            left: `${targetRect.left - pad}px`,
            top: `${targetRect.top - pad}px`,
            width: `${targetRect.width + pad * 2}px`,
            height: `${targetRect.height + pad * 2}px`,
          }}
        >
          {/* Tactical Corner Brackets */}
          <div className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 border-t-2 border-l-2 border-cyan-300" />
          <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 border-t-2 border-r-2 border-cyan-300" />
          <div className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 border-b-2 border-l-2 border-cyan-300" />
          <div className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 border-b-2 border-r-2 border-cyan-300" />

          {/* Pulsing Beacon in Top-Right Corner */}
          <div className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-md shadow-cyan-400" />
          </div>
        </div>
      )}

      {/* ── 3. High-Fidelity Tactical Popover Card ─────────────────────────── */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className="fixed flex flex-col rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-5 shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-2xl text-slate-100 transition-all duration-300 ease-out"
        style={{
          top: `${clampedTop}px`,
          left: `${clampedLeft}px`,
          width: `${popoverWidth}px`,
        }}
      >
        {/* Header: Step Counter, Badge & Skip Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 shadow-sm shadow-cyan-900/50">
              {currentStep.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-500/40">
                  Step {tourStep + 1} of {TOUR_STEPS.length}
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  • {currentStep.badge}
                </span>
              </div>
            </div>
          </div>

          {/* "Skip Tour" Button */}
          <button
            onClick={() => {
              closeTour();
              playTacticalAlertSound('action');
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded-md hover:bg-slate-800/60 group cursor-pointer"
            title="Skip Tour and continue to crisis dashboard"
          >
            <span className="font-medium text-[11px]">Skip Tour</span>
            <X className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-300 transition-colors" />
          </button>
        </div>

        {/* Progress Tracker Bar */}
        <div className="flex items-center gap-1.5 my-3">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTourStep(idx);
                playTacticalAlertSound('action');
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === tourStep
                  ? 'w-7 bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                  : idx < tourStep
                  ? 'w-2.5 bg-cyan-700/80 hover:bg-cyan-600'
                  : 'w-2.5 bg-slate-800 hover:bg-slate-700'
              }`}
              title={`Jump to Step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Title & Explanatory Narrative Content */}
        <div className="space-y-2 py-1">
          <h3
            id="tour-step-title"
            className="text-base font-bold text-white tracking-wide"
          >
            {currentStep.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* Footer Navigation Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            Use ← / → keys • Esc to exit
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {/* Back Button (disabled on Step 1) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                prevTourStep();
                playTacticalAlertSound('action');
              }}
              disabled={tourStep === 0}
              className="h-8 px-3 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>

            {/* Next or Finish / Get Started Button */}
            {isLastStep ? (
              <Button
                size="sm"
                variant="cyan"
                onClick={() => {
                  closeTour();
                  playTacticalAlertSound('action');
                }}
                className="h-8 px-4 text-xs font-bold shadow-lg shadow-cyan-950/70 gap-1.5"
              >
                <span>Get Started</span>
                <Check className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="cyan"
                onClick={() => {
                  nextTourStep();
                  playTacticalAlertSound('action');
                }}
                className="h-8 px-4 text-xs font-bold shadow-lg shadow-cyan-950/70 gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
