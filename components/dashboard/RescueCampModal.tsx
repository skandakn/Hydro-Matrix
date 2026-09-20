/**
 * HYDRO MATRIX: Rescue Camp Command Center & AI Placement Modal
 * Localization: Guwahati — Bahini/Bharalu Basin & Regional High Grounds
 * 
 * Features:
 * - AI Hydrological Placement Engine: Analyzes live water depth, elevation,
 *   and proximity to vulnerable flood bowls to recommend optimal relief sites.
 * - Active Camps Management: Tracks bed capacity, live occupancy, and relief
 *   supplies (food rations, potable water, medical triage, NDRF boats, gensets).
 * - Threat Encroachment Warnings: Real-time alerts if floodwaters approach camp sites.
 * - 1-Click Mass Evacuation Dispatch: Routes stranded citizens to designated safe beds.
 */

'use client';

import React, { useState } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import {
  RescueCamp,
  RescueCampType,
} from '@/types/simulation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tent,
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Users,
  Utensils,
  Droplets,
  HeartPulse,
  Ship,
  Zap,
  MapPin,
  MoveRight,
  Phone,
  Plus,
  Trash2,
  Navigation,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const RescueCampModal: React.FC = () => {
  const {
    flatGrid,
    rescueCamps,
    recommendedSites,
    totalShelteredEvacuees,
    totalRescueCapacity,
    deployRescueCamp,
    dismantleRescueCamp,
    relocateRescueCamp,
    autoDeployRecommendedCamps,
    dispatchSupplies,
    evacuateResidentsToCamp,
    evacuateAllCriticalZonesToCamps,
    selectCell,
  } = useFloodSimulation();

  const { activeModal, setActiveModal, playTacticalAlertSound } = useUIContext();

  const [activeTab, setActiveTab] = useState<'recommendations' | 'active_camps' | 'corridors'>('recommendations');

  if (activeModal !== 'rescue_camps') return null;

  const occupancyRate = totalRescueCapacity > 0
    ? Math.round((totalShelteredEvacuees / totalRescueCapacity) * 100)
    : 0;

  // Find cells requiring evacuation
  const distressedCells = flatGrid.filter(
    n => (n.status === 'CRITICAL' || n.status === 'WARNING') && n.population > 0
  );
  const totalAtRiskPop = distressedCells.reduce((sum, n) => sum + n.population, 0);

  const getCampTypeBadge = (type: RescueCampType) => {
    switch (type) {
      case 'APEX_MEDICAL':
        return <Badge variant="critical" className="text-[10px] gap-1"><HeartPulse className="h-3 w-3" /> Apex Medical</Badge>;
      case 'NDRF_TACTICAL_BASE':
        return <Badge variant="cyan" className="text-[10px] gap-1"><Ship className="h-3 w-3" /> NDRF Water Base</Badge>;
      case 'SUPPLY_DISTRIBUTION':
        return <Badge variant="warning" className="text-[10px] gap-1"><Droplets className="h-3 w-3" /> Supply & Water Hub</Badge>;
      case 'MASS_SHELTER':
      default:
        return <Badge variant="safe" className="text-[10px] gap-1"><Tent className="h-3 w-3" /> Mass Shelter</Badge>;
    }
  };

  const getCampStatusBadge = (camp: RescueCamp) => {
    switch (camp.status) {
      case 'COMPROMISED':
        return <Badge variant="critical" className="text-[9px] animate-pulse">FLOOD COMPROMISED</Badge>;
      case 'AT_RISK_FLOODING':
        return <Badge variant="warning" className="text-[9px] animate-pulse">WATER ENCROACHING</Badge>;
      case 'AT_CAPACITY':
        return <Badge variant="critical" className="text-[9px]">100% FULL</Badge>;
      case 'NEAR_CAPACITY':
        return <Badge variant="warning" className="text-[9px]">NEAR CAPACITY</Badge>;
      case 'OPERATIONAL':
      default:
        return <Badge variant="safe" className="text-[9px]">OPERATIONAL</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 md:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] rounded-2xl border border-cyan-500/40 bg-slate-950/95 shadow-2xl shadow-cyan-950/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/50 text-cyan-400 shadow-md shadow-cyan-500/20">
              <Tent className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Rescue Camp Intelligence & Placement Command
                </h3>
                <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                  GMDA CIVIL DEFENSE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hydrological suitability scoring, strategic high-ground placement, and disaster logistics management
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

        {/* Global Tactical Summary KPI Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-4 bg-slate-900/40 border-b border-slate-800/80">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Active Rescue Camps</span>
              <Tent className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white">{rescueCamps.length}</span>
              <span className="text-[10px] text-cyan-300 font-mono">Commissioned</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Sheltered Evacuees</span>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-300">
                {totalShelteredEvacuees.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">/ {totalRescueCapacity.toLocaleString()} beds</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full transition-all ${
                  occupancyRate > 90 ? 'bg-rose-500' : occupancyRate > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Stranded / At-Risk Citizens</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-rose-400">
                {totalAtRiskPop.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">in {distressedCells.length} sectors</span>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-2.5 flex flex-col justify-center gap-1.5">
            <Button
              size="sm"
              variant="cyan"
              onClick={() => {
                evacuateAllCriticalZonesToCamps();
                playTacticalAlertSound('action');
              }}
              disabled={distressedCells.length === 0 || totalShelteredEvacuees >= totalRescueCapacity}
              className="w-full text-xs font-bold shadow-md shadow-cyan-500/20 gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Evacuate All to Camps</span>
            </Button>
            <div className="text-center text-[10px] text-cyan-300/80 font-mono">
              {totalRescueCapacity - totalShelteredEvacuees > 0
                ? `${(totalRescueCapacity - totalShelteredEvacuees).toLocaleString()} beds available`
                : 'All camps at max capacity'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/30 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'recommendations'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>AI Placement Engine (&ldquo;Where to put camps&rdquo;)</span>
            <Badge variant="cyan" className="text-[9px] px-1.5 py-0">
              {recommendedSites.length} SITES
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('active_camps')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'active_camps'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tent className="h-3.5 w-3.5 text-cyan-400" />
            <span>Active Camps & Logistics (&ldquo;and stuff&rdquo;)</span>
            <Badge variant="safe" className="text-[9px] px-1.5 py-0">
              {rescueCamps.length} ACTIVE
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('corridors')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'corridors'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="h-3.5 w-3.5 text-blue-400" />
            <span>Evacuation Routes & Sector Routing</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: AI RECOMMENDATIONS ENGINE */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {/* Quick Auto-Deploy Network Callout */}
              <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-slate-900 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-950/60 text-amber-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      Strategic Guwahati Relief Network Auto-Deployer
                      <Badge variant="warning" className="text-[9px]">ALGORITHMIC</Badge>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Instantly pitches the top 4 algorithmically validated high-ground refuges spanning North, South, Central & West Guwahati.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    autoDeployRecommendedCamps();
                    playTacticalAlertSound('action');
                  }}
                  className="shrink-0 border-amber-500/50 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 hover:text-white text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Auto-Deploy Top 4 Camps
                </Button>
              </div>

              {/* Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {recommendedSites.length === 0 ? (
                  <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-200">All optimal elevated sites are currently commissioned.</p>
                    <p className="text-xs text-slate-500 mt-1">Review active camps tab to manage supply allocations.</p>
                  </div>
                ) : (
                  recommendedSites.map((site, idx) => (
                    <div
                      key={site.cellId}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 hover:border-cyan-500/40 p-4 transition-all flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                                #{idx + 1}
                              </span>
                              <h5 className="font-bold text-sm text-white">{site.name}</h5>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              Coordinates: [{site.gridX}, {site.gridY}] • Road: {site.nearestRoadAccess}
                            </span>
                          </div>
                          {getCampTypeBadge(site.suggestedCampType)}
                        </div>

                        {/* Suitability Score Bar */}
                        <div className="rounded-lg bg-slate-950/80 p-2.5 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Hydrological Safety Score:</span>
                            <span className="font-mono font-bold text-cyan-300">{site.suitabilityScore} / 100</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                              style={{ width: `${site.suitabilityScore}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 pt-0.5 italic">
                            {site.suitabilityReason}
                          </p>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-300">
                          <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">Elevation</span>
                            <strong className="text-white font-mono">{site.elevationMeters.toFixed(1)}m MSL</strong>
                          </div>
                          <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">Water Depth</span>
                            <strong className="text-emerald-400 font-mono">0.00m (SAFE)</strong>
                          </div>
                          <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">Vulnerable Pop</span>
                            <strong className="text-amber-300 font-mono">{site.nearbyPopulationAtRisk.toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <Button
                          size="xs"
                          variant="cyan"
                          onClick={() => {
                            deployRescueCamp({
                              gridX: site.gridX,
                              gridY: site.gridY,
                              name: `${site.name} Relief Sanctuary`,
                              type: site.suggestedCampType,
                              capacity: site.suggestedCapacity,
                              contactPerson: 'Kamrup Civil Defense Command',
                              contactPhone: '+91 361 223 7000',
                            });
                            playTacticalAlertSound('action');
                          }}
                          className="flex-1 text-[11px] font-semibold gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Deploy This Camp ({site.suggestedCapacity.toLocaleString()} cap)
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            selectCell(site.cellId);
                            setActiveModal('none');
                          }}
                          className="text-[10px] border-slate-700 hover:border-slate-500"
                        >
                          View Map
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE CAMPS & LOGISTICS MANAGEMENT ("and stuff") */}
          {activeTab === 'active_camps' && (
            <div className="space-y-4">
              {rescueCamps.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
                  <Tent className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200">No active rescue camps deployed.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Switch to the AI Placement Engine tab to deploy recommended high-ground camps.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rescueCamps.map((camp) => {
                    const pct = Math.round((camp.currentOccupancy / camp.capacity) * 100);
                    const isAtRisk = camp.status === 'AT_RISK_FLOODING' || camp.status === 'COMPROMISED';

                    return (
                      <div
                        key={camp.id}
                        className={`rounded-xl border p-4.5 transition-all space-y-4 ${
                          isAtRisk
                            ? 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30'
                            : 'border-slate-800 bg-slate-900/70'
                        }`}
                      >
                        {/* Camp Title Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/50 text-cyan-300">
                              <Tent className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white">{camp.name}</h4>
                                {camp.assameseName && (
                                  <span className="text-xs text-slate-400 font-serif">({camp.assameseName})</span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                Sector [{camp.gridX}, {camp.gridY}] • Elev: {camp.elevationMeters.toFixed(1)}m MSL
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getCampTypeBadge(camp.type)}
                            {getCampStatusBadge(camp)}
                          </div>
                        </div>

                        {/* Encroachment Alert Banner */}
                        {camp.riskAlert && (
                          <div className="rounded-lg border border-rose-500/50 bg-rose-950/40 p-3 flex items-center justify-between text-xs text-rose-300">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse" />
                              <span>{camp.riskAlert}</span>
                            </div>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => {
                                // Find highest dry ground from recommended
                                if (recommendedSites.length > 0) {
                                  const topSite = recommendedSites[0];
                                  relocateRescueCamp(camp.id, topSite.gridX, topSite.gridY);
                                  playTacticalAlertSound('critical');
                                }
                              }}
                              className="text-[10px] font-bold shrink-0 ml-2"
                            >
                              Relocate to High Ground
                            </Button>
                          </div>
                        )}

                        {/* Occupancy & Capacity */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-cyan-400" />
                              Shelter Occupancy:
                            </span>
                            <span className="font-mono font-bold text-white">
                              {camp.currentOccupancy.toLocaleString()} / {camp.capacity.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-400' : 'bg-cyan-400'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Relief Supplies ("and stuff") Inventory Grid */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Relief Supplies & Emergency Equipment Staged</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Food Rations */}
                            <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Food Rations</span>
                                  <Utensils className="h-3.5 w-3.5 text-amber-400" />
                                </div>
                                <div className="mt-1 font-mono font-bold text-sm text-white">
                                  {camp.supplies.foodRationsDays} Days
                                </div>
                              </div>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => dispatchSupplies(camp.id, 'foodRationsDays', 2)}
                                className="w-full mt-2 text-[9px] h-5 border-slate-700 hover:border-amber-500/50"
                              >
                                +2 Days Restock
                              </Button>
                            </div>

                            {/* Potable Drinking Water */}
                            <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Potable Water</span>
                                  <Droplets className="h-3.5 w-3.5 text-blue-400" />
                                </div>
                                <div className="mt-1 font-mono font-bold text-sm text-white">
                                  {camp.supplies.potableWaterLiters.toLocaleString()} L
                                </div>
                              </div>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => dispatchSupplies(camp.id, 'potableWaterLiters', 5000)}
                                className="w-full mt-2 text-[9px] h-5 border-slate-700 hover:border-blue-500/50"
                              >
                                +5,000L Delivery
                              </Button>
                            </div>

                            {/* NDRF Rescue Boats */}
                            <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>NDRF Rafts</span>
                                  <Ship className="h-3.5 w-3.5 text-cyan-400" />
                                </div>
                                <div className="mt-1 font-mono font-bold text-sm text-white">
                                  {camp.supplies.rescueBoats} Boats
                                </div>
                              </div>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => dispatchSupplies(camp.id, 'rescueBoats', 2)}
                                className="w-full mt-2 text-[9px] h-5 border-slate-700 hover:border-cyan-500/50"
                              >
                                +2 Lifeboats
                              </Button>
                            </div>

                            {/* Medical Trauma Kits */}
                            <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Medical Kits</span>
                                  <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                                </div>
                                <div className="mt-1 font-mono font-bold text-sm text-white">
                                  {camp.supplies.medicalKits} Kits
                                </div>
                              </div>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => dispatchSupplies(camp.id, 'medicalKits', 100)}
                                className="w-full mt-2 text-[9px] h-5 border-slate-700 hover:border-rose-500/50"
                              >
                                +100 Med Kits
                              </Button>
                            </div>
                          </div>

                          {/* Secondary Equipment Bar */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5 text-yellow-400" />
                              Backup Gensets: <strong className="text-white font-mono">{camp.supplies.powerGenerators}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>
                              Beds & Blankets: <strong className="text-white font-mono">{camp.supplies.blanketsAndBeds.toLocaleString()}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>
                              Mobile Toilets: <strong className="text-white font-mono">{camp.supplies.sanitationUnits}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Tactical Liaison & Command Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Phone className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Officer: <strong className="text-slate-200">{camp.contactPerson}</strong></span>
                            <span className="text-slate-600">|</span>
                            <span className="font-mono text-cyan-300">{camp.contactPhone}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                selectCell(`cell-${camp.gridX}-${camp.gridY}`);
                                setActiveModal('none');
                              }}
                              className="text-[10px] border-slate-700"
                            >
                              <MapPin className="h-3 w-3 mr-1" /> View on Map
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => {
                                dismantleRescueCamp(camp.id);
                                playTacticalAlertSound('warning');
                              }}
                              className="text-[10px]"
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Dismantle
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECTOR ROUTING & EVACUATION CORRIDORS */}
          {activeTab === 'corridors' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>
                  Flooded sectors automatically mapped to the nearest operational high-ground rescue refuge.
                </span>
                <Badge variant="warning" className="text-[10px]">
                  {distressedCells.length} SECTORS AT RISK
                </Badge>
              </div>

              {distressedCells.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-200">No sectors currently inundated.</p>
                  <p className="text-xs text-slate-500 mt-1">Water levels remain below warning thresholds.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {distressedCells.map((cell) => {
                    // Find closest operational camp
                    let nearestCamp: RescueCamp | null = null;
                    let minDist = Infinity;
                    for (const c of rescueCamps) {
                      if (c.status === 'OPERATIONAL' || c.status === 'NEAR_CAPACITY') {
                        const d = Math.hypot(cell.x - c.gridX, cell.y - c.gridY);
                        if (d < minDist) {
                          minDist = d;
                          nearestCamp = c;
                        }
                      }
                    }

                    const distKm = (minDist * 0.25).toFixed(1);
                    const isCrit = cell.status === 'CRITICAL';

                    return (
                      <div
                        key={cell.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs text-white">{cell.name}</h5>
                            <Badge variant={isCrit ? 'critical' : 'warning'} className="text-[9px]">
                              {cell.currentWaterLevel.toFixed(2)}m INUNDATION
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>Pop: <strong className="text-slate-200">{cell.population.toLocaleString()}</strong></span>
                            <span>Drainage: <strong className="text-cyan-300">{cell.channelType}</strong></span>
                            {nearestCamp && (
                              <span className="flex items-center gap-1 text-emerald-300 font-medium">
                                <MoveRight className="h-3 w-3" /> Assigned: {nearestCamp.name} ({distKm} km)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant={cell.evacuationOrdered ? 'destructive' : 'cyan'}
                            onClick={() => {
                              if (nearestCamp) {
                                evacuateResidentsToCamp(cell.id, nearestCamp.id, 800);
                              }
                              playTacticalAlertSound('action');
                            }}
                            className="text-[11px]"
                          >
                            {cell.evacuationOrdered ? 'Evacuate Another 800' : 'Evacuate to Camp'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Assam State Disaster Management Authority (ASDMA) & GMDA EOI GIS Protocol</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveModal('none')}>
            Close Command Center
          </Button>
        </div>
      </div>
    </div>
  );
};
