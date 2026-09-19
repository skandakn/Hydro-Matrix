import React from 'react';
import { Waves } from 'lucide-react';

export const Legend: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-950/85 p-3 text-xs shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-200">
        <span className="flex items-center gap-1.5">
          <Waves className="h-3.5 w-3.5 text-cyan-400" />
          Tactical Map Legend
        </span>
        <span className="text-[10px] text-slate-400">2.5D GRID</span>
      </div>

      {/* Water Inundation Levels */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Inundation Depth</div>
        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <div className="flex items-center gap-1.5 rounded bg-emerald-950/40 px-2 py-1 border border-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span className="text-emerald-300 font-medium">Safe (&lt;0.25m)</span>
          </div>
          <div className="flex items-center gap-1.5 rounded bg-amber-950/40 px-2 py-1 border border-amber-500/30">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span className="text-amber-300 font-medium">Warn (0.25-0.75m)</span>
          </div>
          <div className="flex items-center gap-1.5 rounded bg-rose-950/40 px-2 py-1 border border-rose-500/30">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
            <span className="text-rose-300 font-medium">Crit (&gt;0.75m)</span>
          </div>
        </div>
      </div>

      {/* Infrastructure Symbols */}
      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-300">
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-rose-900/60 text-[9px] font-bold text-rose-300">H</span>
          <span>Hospital</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-900/60 text-[9px] font-bold text-amber-300">⚡</span>
          <span>Power</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-900/60 text-[9px] font-bold text-cyan-300">🌀</span>
          <span>Pump</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-900/60 text-[9px] font-bold text-emerald-300">🛡️</span>
          <span>Shelter</span>
        </div>
      </div>
    </div>
  );
};
