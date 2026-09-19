/**
 * FLOWSHIELD: GMDA GIS-Based Drainage Ecosystem & Master Plan Integration Modal
 * 
 * System Narrative:
 * Highlights alignment with the Guwahati Metropolitan Development Authority (GMDA),
 * the Expression of Interest (EOI) for a GIS-based comprehensive drainage master plan
 * and Detailed Project Report (DPR) for Guwahati, and the inter-agency flood mitigation framework.
 */

'use client';

import React from 'react';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  X,
  FileCheck2,
  Waves,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { RECOGNIZED_CHANNELS } from '@/lib/simulation-engine/cityGrid';

export const GMDAInfoModal: React.FC = () => {
  const { activeModal, setActiveModal } = useUIContext();

  if (activeModal !== 'gmda_info') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[88vh] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-6 shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/50 text-cyan-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  GMDA GIS-Based Drainage Planning Ecosystem
                </h3>
                <Badge variant="cyan" className="text-[10px] font-mono">
                  EOI DRAINAGE MASTER PLAN & DPR
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Guwahati Metropolitan Development Authority (GMDA) • Government of Assam
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs">
          {/* Institutional Statement & EOI Alignment */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <FileCheck2 className="h-4 w-4 text-cyan-400" />
              <span>Alignment with GMDA Comprehensive Drainage Master Plan & DPR</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              This digital twin platform directly integrates with the <strong>Guwahati Metropolitan Development Authority’s (GMDA)</strong> established GIS-based drainage-planning ecosystem. It is purpose-built to operationalize the strategic objectives outlined in the <strong>Expression of Interest (EOI)</strong> issued for a <em>GIS-based comprehensive drainage master plan and Detailed Project Report (DPR) for Guwahati</em>.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
              <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-300">
                Agency: GMDA / GMC / WRD
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-emerald-300">
                Basin: Bahini / Bharalu Watershed
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-amber-300">
                20 GMDA Auto-Priming Pumps
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-purple-300">
                18 AWS Telemetry Nodes
              </span>
            </div>
          </div>

          {/* 5 Government-Recognized Primary Drainage Channels */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-400" />
              <span>5 Government-Recognized Primary Drainage Corridors</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {Object.values(RECOGNIZED_CHANNELS).filter(c => c.id !== 'Brahmaputra').map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white" style={{ color: ch.color }}>
                      {ch.name}
                    </span>
                    <Badge variant={ch.status === 'OPTIMAL' ? 'safe' : ch.status === 'SILTED' ? 'warning' : 'critical'} className="text-[9px]">
                      {ch.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <div><strong>Origin:</strong> {ch.origin}</div>
                    <div><strong>Outfall:</strong> {ch.outfall}</div>
                    <div className="font-mono text-[10px] text-slate-400 pt-0.5">
                      Length: {ch.lengthKm} km • Design Cap: {ch.maxDesignCapacityM3S} m³/s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-world Sensor & Dewatering Infrastructure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                <Cpu className="h-4 w-4 text-amber-400" />
                <span>18 Automatic Weather Stations (AWS) Mesh</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deployed strategically across Dispur, Panbazar, Jalukbari, Khanapara, Zoo Road, Noonmati, and Beltola to record micro-catchment precipitation gradients and orographic runoff from the Meghalaya hills.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                <ShieldAlert className="h-4 w-4 text-cyan-400" />
                <span>20 GMDA Auto-Priming Dewatering Pumps</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Heavy auto-priming diesel and electric pump fleet stationed at severe waterlogging epicenters including Anil Nagar, Nabin Nagar, Tarun Nagar, Rukminigaon, and the Bharalumukh Brahmaputra outfall.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <span className="text-[11px] text-slate-500 font-mono">
            Guwahati Metropolitan Development Authority • GIS Master Plan EOI Support
          </span>
          <Button size="sm" variant="cyan" onClick={() => setActiveModal('none')}>
            Acknowledge & Return
          </Button>
        </div>
      </div>
    </div>
  );
};
