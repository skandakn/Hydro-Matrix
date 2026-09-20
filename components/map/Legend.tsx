import React, { useState } from 'react';
import { Waves, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIContext } from '@/context/UIContext';

export const Legend: React.FC = () => {
  const { language, t } = useUIContext();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5 rounded-xl border border-slate-800/90 bg-slate-950/92 p-2.5 sm:p-3 text-xs shadow-2xl backdrop-blur-md max-w-xs md:max-w-sm transition-all">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-200">
        <span className="flex items-center gap-1.5">
          <Waves className="h-3.5 w-3.5 text-cyan-400" />
          <span>Guwahati Basin</span>
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
            GMDA GIS
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expand Legend' : 'Collapse Legend'}
          >
            {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* 5 Government-Recognized Primary Drainage Channels */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {t('fiveChannels')}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center gap-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 border border-cyan-500/30">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                <span className="text-cyan-300 font-medium truncate">
                  {language === 'as' ? 'ভৰলু নদী' : language === 'hi' ? 'भरलु नदी' : 'Bharalu (ভৰলু)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 border border-amber-500/30">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                <span className="text-amber-300 font-medium truncate">
                  {language === 'as' ? 'বাহিনী নদী' : language === 'hi' ? 'वाहिनी नदी' : 'Bahini (বাহিনী)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                <span className="text-emerald-300 font-medium truncate">
                  {language === 'as' ? 'বশিষ্ঠ নদী' : language === 'hi' ? 'वशिष्ठ नदी' : 'Basistha (বশিষ্ঠ)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 border border-blue-500/30">
                <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_6px_#3b82f6]" />
                <span className="text-blue-300 font-medium truncate">
                  {language === 'as' ? 'মৰা ভৰলু' : language === 'hi' ? 'मरा भरलु' : 'Mora Bharalu (মৰা)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded bg-slate-900/60 px-1.5 py-0.5 border border-purple-500/30 col-span-2">
                <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
                <span className="text-purple-300 font-medium truncate">
                  {language === 'as' ? 'লাখিমীজান (দীঘলীপৰীয়া নলা)' : language === 'hi' ? 'लाखिमीजान चैनल' : 'Lakhimijan (Deepor Beel Outlet)'}
                </span>
              </div>
            </div>
          </div>

      {/* Inundation Depth Scale */}
      <div className="space-y-1 pt-1 border-t border-slate-800">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Inundation Depth</div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <div className="flex items-center gap-1 rounded bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
            <span className="text-emerald-300 font-medium">&lt;0.25m Safe</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-amber-950/40 px-1.5 py-0.5 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
            <span className="text-amber-300 font-medium">0.25-0.75m</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-rose-950/40 px-1.5 py-0.5 border border-rose-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse" />
            <span className="text-rose-300 font-medium">&gt;0.75m Crit</span>
          </div>
        </div>
      </div>

      {/* Hardware & Strategic Facilities */}
      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800 text-[10px] text-slate-300">
        <div className="flex items-center gap-1" title="20 GMDA Auto-Priming Dewatering Pumps">
          <span>🌀</span>
          <span className="text-cyan-300">GMDA Dewatering Pump</span>
        </div>
        <div className="flex items-center gap-1" title="18 Automatic Weather Stations (AWS)">
          <span>📡</span>
          <span className="text-amber-300">18 AWS Weather Stations</span>
        </div>
        <div className="flex items-center gap-1" title="Strategic High-Ground Relief Sanctuary">
          <span>⛺</span>
          <span className="text-emerald-300 font-semibold">Rescue Camps (Relief Hub)</span>
        </div>
        <div className="flex items-center gap-1" title="Assam Secretariat & GMCH Apex Hospital">
          <span>🏛️</span>
          <span>Capital / GMCH / Deepor Beel</span>
        </div>
      </div>
    </>
  )}
</div>
  );
};
