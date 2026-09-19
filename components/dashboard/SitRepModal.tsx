/**
 * FLOWSHIELD: Incident Situation Report (SitRep) Modal
 * Generates an executive crisis debriefing report with live hydrological calculations.
 */

'use client';

import React from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  X,
  Printer,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatTime, formatPopulation } from '@/lib/utils';

export const SitRepModal: React.FC = () => {
  const {
    currentTick,
    elapsedSeconds,
    floodedAreaSqKm,
    affectedPopulation,
    criticalZoneCount,
    maxWaterDepth,
    config,
    grid,
  } = useFloodSimulation();

  const { activeModal, setActiveModal } = useUIContext();

  if (activeModal !== 'export_report') return null;

  // Count compromised infrastructure
  const compromised = grid.filter(n => n.infrastructure && n.status === 'CRITICAL');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Executive Incident Situation Report (SitRep)
                <Badge variant="cyan" className="text-[10px]">OPERATIONAL</Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Generated: {new Date().toISOString()} • Simulation T+{formatTime(elapsedSeconds)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
              1. EXECUTIVE CRISIS SUMMARY
            </div>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              The FLOWSHIELD 2D Shallow Water numerical simulation model has computed {currentTick} discrete timesteps ({formatTime(elapsedSeconds)} elapsed). Current precipitation rate is calibrated at {config.rainfallIntensity} mm/h with municipal stormwater discharge operating at {Math.round(config.drainageSystemEfficiency * 100)}% nominal efficiency.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] text-slate-400 block">TOTAL INUNDATION</span>
              <span className="text-base font-bold text-white">{floodedAreaSqKm} km²</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] text-slate-400 block">EXPOSED RESIDENTS</span>
              <span className="text-base font-bold text-amber-400">{formatPopulation(affectedPopulation)}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] text-slate-400 block">CRITICAL SECTORS</span>
              <span className="text-base font-bold text-rose-400">{criticalZoneCount} / {grid.length}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] text-slate-400 block">PEAK WATER DEPTH</span>
              <span className="text-base font-bold text-cyan-300">{maxWaterDepth} m</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
              2. STRATEGIC INFRASTRUCTURE ASSESSMENT
            </div>
            {compromised.length === 0 ? (
              <p className="text-emerald-400 font-sans text-xs flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                All high-priority hospitals, power substations, and emergency shelters remain operational.
              </p>
            ) : (
              <div className="space-y-1 font-sans text-xs">
                {compromised.map((c) => (
                  <div key={c.id} className="text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{c.infrastructureName}</strong> in Sector [{c.x},{c.y}] has water depth of {c.currentWaterLevel.toFixed(2)}m (Critical Threshold Exceeded).
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1 text-slate-400 text-[11px]">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              3. NUMERICAL SIMULATION METHODOLOGY & REPRODUCIBILITY
            </div>
            <div>Model: 2D Diffusive Wave Shallow Water Approximations with Manning roughness n={config.surfaceRoughness}.</div>
            <div>Grid Discretization: {Math.sqrt(grid.length)}x{Math.sqrt(grid.length)} cells (250m x 250m cell resolution).</div>
            <div>Volume Conservation: Strict CFL flux damping limit &lt;= 0.45 h_avail per timestep.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print SitRep</span>
          </Button>
          <Button size="sm" variant="default" onClick={() => setActiveModal('none')}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
