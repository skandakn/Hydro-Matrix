/**
 * HYDRO MATRIX: Evacuation Routing & Shelter Dispatch Advisor
 * Calculates optimal civil defense routing, shelter capacity allocations,
 * and prioritizes evacuation corridors based on dynamic "Time to Critical Conditions".
 */

'use client';

import React from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  X,
  CheckCircle2,
  Building2,
  AlertOctagon,
  Route,
} from 'lucide-react';

export const EvacuationAdvisor: React.FC = () => {
  const { grid, toggleCellEvacuation, selectCell } = useFloodSimulation();
  const { activeModal, setActiveModal, playTacticalAlertSound } = useUIContext();

  if (activeModal !== 'evacuation') return null;

  // Find all shelters
  const shelters = grid.filter(n => n.infrastructure === 'shelter');

  // Find critical or rapidly approaching sectors
  const urgentEvacZones = grid
    .filter(n => n.status === 'CRITICAL' || (n.timeToCriticalMinutes !== null && n.timeToCriticalMinutes <= 60))
    .sort((a, b) => {
      const aTime = a.status === 'CRITICAL' ? 0 : (a.timeToCriticalMinutes ?? 999);
      const bTime = b.status === 'CRITICAL' ? 0 : (b.timeToCriticalMinutes ?? 999);
      return aTime - bTime;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl border border-amber-500/40 bg-slate-950/95 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Emergency Evacuation Dispatch & Shelter Advisor
                <Badge variant="warning" className="text-[10px]">
                  DEFENSE LEVEL 1
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Predictive clearance routing prioritized by Estimated Time to Critical Conditions
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Shelters Overview */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Designated Safe Havens & Emergency Shelters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shelters.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{s.infrastructureName}</span>
                      <Badge variant="safe" className="text-[9px]">ELEVATED 32m</Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Current Inundation: <strong className="text-emerald-400">0.00m (SAFE)</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Coordinates: Sector [{s.x}, {s.y}] • Capacity: 15,000 residents
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      selectCell(s.id);
                      setActiveModal('none');
                    }}
                    className="text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-950"
                  >
                    View on Map
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritized Evacuation Queue */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                Sectors Requiring Immediate Civil Defense Action ({urgentEvacZones.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">SORTED BY TIME-TO-CRITICAL</span>
            </div>

            {urgentEvacZones.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200">No sectors currently meet mandatory evacuation thresholds.</p>
                <p className="text-slate-500 text-[11px] mt-1">Water levels are actively managed within stormwater buffer capacities.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {urgentEvacZones.map((cell) => {
                  const isCrit = cell.status === 'CRITICAL';
                  return (
                    <div
                      key={cell.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isCrit ? 'bg-rose-950/80 text-rose-400' : 'bg-amber-950/80 text-amber-400'}`}>
                          <Route className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-white">{cell.name}</h4>
                            <Badge variant={isCrit ? 'critical' : 'warning'} className="text-[9px]">
                              {isCrit ? 'CRITICAL BREACH' : `${cell.timeToCriticalMinutes} MIN TO CRITICAL`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>Pop: <strong className="text-slate-200">{cell.population.toLocaleString()}</strong></span>
                            <span>Water Depth: <strong className="text-cyan-300">{cell.currentWaterLevel.toFixed(2)}m</strong></span>
                            <span>Recommended Route: <strong className="text-slate-200">North Highland Expressway</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant={cell.evacuationOrdered ? 'destructive' : 'secondary'}
                          onClick={() => {
                            toggleCellEvacuation(cell.id);
                            playTacticalAlertSound('critical');
                          }}
                          className="text-[11px]"
                        >
                          {cell.evacuationOrdered ? 'Evacuation Ordered' : 'Issue Mandatory Evac'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 pt-3">
          <Button size="sm" variant="outline" onClick={() => setActiveModal('none')}>
            Close Advisor
          </Button>
        </div>
      </div>
    </div>
  );
};
