/**
 * HYDRO MATRIX: Statistically Driven Relief Camp & Evacuation Routing System
 * Localization: Guwahati — Bahini/Bharalu Basin & Regional Safe Havens
 * 
 * Implements statistically working Relief Camps:
 * - Data Model:
 *   interface ReliefCamp {
 *     id: string;
 *     name: string;
 *     capacity: number;          // Total holding capacity (e.g. 5,000)
 *     currentOccupancy: number;  // Displaced people currently sheltered
 *     status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL';
 *     elevation: number;         // Height above MSL (e.g. 55.0m)
 *     connectedSectors: string[]; // Sectors routed here (e.g., ['Anil Nagar', 'Nabin Nagar'])
 *   }
 * - Designated Shelters:
 *   1. Sarusajai Sports Complex (12,000 capacity, 58.5m MSL)
 *   2. GMCH Elevated Campus (8,500 capacity, 54.5m MSL)
 *   3. Cotton University Halls (6,000 capacity, 53.2m MSL)
 *   4. Regional Relief Centers (9,000 capacity, 52.0m MSL)
 * - Dynamic Intake:
 *   When low-lying cells flood (>0.25m depth), displaced citizens are computed from
 *   `affectedResidents` and sector severity, dynamically routed into connected shelters.
 * - Dynamic Occupancy Rates:
 *   * < 70%: Emerald ("Available")
 *   * 70% - 99%: Amber ("High Occupancy")
 *   * >= 100%: Crimson ("Full - Diverting Influx")
 * - Live capacity progress bars, aggregate metrics (Total Capacity vs Displaced Evacuees),
 *   and city-wide capacity breach alert.
 */

'use client';

import React, { useMemo } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { GridNode, ReliefCamp } from '@/types/simulation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  X,
  CheckCircle2,
  Building2,
  AlertOctagon,
  Route,
  Tent,
  MapPin,
  ArrowRight,
} from 'lucide-react';

// Static metadata for Guwahati's 4 designated municipal safe havens
const DESIGNATED_SHELTERS_SPEC: Omit<ReliefCamp, 'currentOccupancy' | 'status'>[] = [
  {
    id: 'camp-sarusajai',
    name: 'Sarusajai Sports Complex',
    capacity: 12000,
    elevation: 58.5,
    connectedSectors: ['Hatigaon', 'Beltola', 'Lokhra', 'Basistha', 'Jorabat'],
  },
  {
    id: 'camp-gmch',
    name: 'GMCH Elevated Campus',
    capacity: 8500,
    elevation: 54.5,
    connectedSectors: ['Bhangagarh', 'Zoo Road', 'Gorchuk', 'Christian Basti', 'Dispur'],
  },
  {
    id: 'camp-cotton',
    name: 'Cotton University Halls',
    capacity: 6000,
    elevation: 53.2,
    connectedSectors: ['Panbazar', 'Uzanbazar', 'Chandmari', 'Machkhowa', 'Paltan Bazar'],
  },
  {
    id: 'camp-regional',
    name: 'Regional Relief Centers',
    capacity: 9000,
    elevation: 52.0,
    connectedSectors: ['Anil Nagar', 'Nabin Nagar', 'Tarun Nagar', 'Lachit Nagar', 'Bharalumukh'],
  },
];

export const EvacuationAdvisor: React.FC = () => {
  const {
    grid,
    flatGrid,
    affectedResidents,
    toggleCellEvacuation,
    selectCell,
  } = useFloodSimulation();
  const { activeModal, setActiveModal, playTacticalAlertSound } = useUIContext();

  // Resolve 1D cell list safely
  const cells: GridNode[] = useMemo(() => {
    if (flatGrid && flatGrid.length > 0) return flatGrid;
    if (Array.isArray(grid) && grid.length > 0) {
      return Array.isArray(grid[0]) ? (grid as unknown as GridNode[][]).flat() : (grid as unknown as GridNode[]);
    }
    return [];
  }, [flatGrid, grid]);

  // Total municipal holding capacity
  const totalShelterCapacity = useMemo(() => {
    return DESIGNATED_SHELTERS_SPEC.reduce((sum, s) => sum + s.capacity, 0);
  }, []);

  // Compute dynamic shelter intake and occupancy
  const reliefCamps: ReliefCamp[] = useMemo(() => {
    // 1. Identify low-lying cells that are flooded (> 0.25m warning threshold)
    const floodedCells = cells.filter(cell => cell.waterDepth > 0.25);

    // Calculate direct displaced population from flooded cells connected to each camp
    const campIntakes = DESIGNATED_SHELTERS_SPEC.map(spec => {
      // Find cells belonging to this shelter's connected sectors
      const connectedFloodedCells = floodedCells.filter(cell =>
        spec.connectedSectors.some(sector =>
          cell.name.toLowerCase().includes(sector.toLowerCase()) ||
          cell.locality?.toLowerCase().includes(sector.toLowerCase())
        )
      );

      // Sum displaced residents from connected cells
      let sectorDirectDisplaced = 0;
      for (const cell of connectedFloodedCells) {
        // Higher water depth forces higher proportion of displacement
        const severityFactor = cell.evacuationOrdered
          ? 1.0
          : Math.min(1.0, Math.max(0.25, (cell.waterDepth - 0.25) / 0.50));
        sectorDirectDisplaced += Math.round(cell.population * severityFactor);
      }

      // Precautionary baseline occupancy (pre-staged civil defense beds)
      const baselineOccupancy = Math.round(spec.capacity * 0.08); // ~8% baseline standby

      // Proportional allocation of city-wide affected residents based on shelter capacity
      const proportionalGlobalShare = totalShelterCapacity > 0
        ? Math.round(affectedResidents * (spec.capacity / totalShelterCapacity))
        : 0;

      // Combined dynamic intake: takes maximum of direct sector displacement and proportional city-wide load
      const rawOccupancy = Math.max(
        baselineOccupancy,
        Math.max(sectorDirectDisplaced, proportionalGlobalShare)
      );

      // Compute occupancy percentage
      const occupancyRate = (rawOccupancy / spec.capacity) * 100;

      // Determine status according to required dynamic thresholds:
      // < 70%: 'AVAILABLE'
      // 70% - 99%: 'NEAR_CAPACITY'
      // >= 100%: 'FULL'
      let status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL' = 'AVAILABLE';
      if (occupancyRate >= 100) {
        status = 'FULL';
      } else if (occupancyRate >= 70) {
        status = 'NEAR_CAPACITY';
      } else {
        status = 'AVAILABLE';
      }

      return {
        ...spec,
        currentOccupancy: rawOccupancy,
        status,
      };
    });

    return campIntakes;
  }, [cells, affectedResidents, totalShelterCapacity]);

  // Aggregate stats across all relief shelters
  const aggregateMetrics = useMemo(() => {
    const totalDisplacedEvacuees = reliefCamps.reduce((sum, c) => sum + c.currentOccupancy, 0);
    const overallUtilization = totalShelterCapacity > 0
      ? (totalDisplacedEvacuees / totalShelterCapacity) * 100
      : 0;
    const availableBeds = Math.max(0, totalShelterCapacity - totalDisplacedEvacuees);
    const isBreached = totalDisplacedEvacuees >= totalShelterCapacity || reliefCamps.some(c => c.status === 'FULL');
    const deficitCount = Math.max(0, totalDisplacedEvacuees - totalShelterCapacity);

    return {
      totalDisplacedEvacuees,
      overallUtilization,
      availableBeds,
      isBreached,
      deficitCount,
    };
  }, [reliefCamps, totalShelterCapacity]);

  // Find flooded sectors requiring rapid evacuation clearance (>0.25m depth)
  const urgentEvacZones = useMemo(() => {
    return cells
      .filter(n => n.waterDepth > 0.25 || n.status === 'CRITICAL')
      .sort((a, b) => {
        if (a.status === 'CRITICAL' && b.status !== 'CRITICAL') return -1;
        if (b.status === 'CRITICAL' && a.status !== 'CRITICAL') return 1;
        return (b.waterDepth) - (a.waterDepth);
      });
  }, [cells]);

  // Helper to find the best connected relief camp for a sector
  const getDestinationCamp = (cell: GridNode): ReliefCamp => {
    const matched = reliefCamps.find(camp =>
      camp.connectedSectors.some(sector =>
        cell.name.toLowerCase().includes(sector.toLowerCase()) ||
        cell.locality?.toLowerCase().includes(sector.toLowerCase())
      )
    );
    if (matched) return matched;
    // Fallback to the camp with lowest occupancy percentage
    return [...reliefCamps].sort((a, b) => (a.currentOccupancy / a.capacity) - (b.currentOccupancy / b.capacity))[0];
  };

  if (activeModal !== 'evacuation') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Emergency Evacuation Dispatch &amp; Relief Camp Capacity System
                </h3>
                <Badge variant="warning" className="text-[10px] font-mono">
                  CIVIL DEFENSE LEVEL 1
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Guwahati Metropolitan Disaster Authority • Predictive intake routing &amp; live shelter capacity management
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close Evacuation Advisor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 custom-scrollbar">
          {/* 1. AGGREGATE CAPACITY & DISPLACEMENT KPIS (4 CARDS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* KPI 1: Total Holding Capacity */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-inner">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Shelter Capacity
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-white">
                {totalShelterCapacity.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-normal">beds</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Across 4 designated havens
              </div>
            </div>

            {/* KPI 2: Total Displaced Evacuees */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3 shadow-inner">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Total Displaced Evacuees
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-amber-300">
                {aggregateMetrics.totalDisplacedEvacuees.toLocaleString()}{' '}
                <span className="text-xs text-amber-400/70 font-normal">citizens</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                From flooded sectors (&gt;0.25m)
              </div>
            </div>

            {/* KPI 3: Overall Utilization */}
            <div
              className={`rounded-xl border p-3 shadow-inner ${
                aggregateMetrics.overallUtilization >= 100
                  ? 'border-rose-500/40 bg-rose-950/25'
                  : aggregateMetrics.overallUtilization >= 70
                  ? 'border-amber-500/30 bg-amber-950/20'
                  : 'border-emerald-500/30 bg-emerald-950/15'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>City Utilization</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                    aggregateMetrics.overallUtilization >= 100
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      : aggregateMetrics.overallUtilization >= 70
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {aggregateMetrics.overallUtilization >= 100
                    ? 'FULL'
                    : aggregateMetrics.overallUtilization >= 70
                    ? 'HIGH'
                    : 'AVAILABLE'}
                </span>
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-white">
                {aggregateMetrics.overallUtilization.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Dynamic absorption rate
              </div>
            </div>

            {/* KPI 4: Net Available Buffer */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-inner">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Net Available Intake
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-400">
                {aggregateMetrics.availableBeds.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-normal">beds</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Remaining intake headroom
              </div>
            </div>
          </div>

          {/* 2. CITY-WIDE CAPACITY BREACH ALERT (HIGH-VISIBILITY BANNER) */}
          {aggregateMetrics.isBreached && (
            <div className="rounded-xl border border-rose-500/80 bg-rose-950/40 p-3.5 shadow-lg shadow-rose-950/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 rounded-lg bg-rose-900/50 text-rose-300 shrink-0 border border-rose-500/50 mt-0.5">
                <AlertOctagon className="h-5 w-5 animate-pulse" />
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-rose-200 uppercase tracking-wide">
                    CRITICAL ALERT: Municipal Relief Capacity Breach / Overflow Active
                  </h4>
                  <Badge variant="critical" className="text-[9px] font-mono">
                    DEFICIT: {aggregateMetrics.deficitCount.toLocaleString()} EVACUEES
                  </Badge>
                </div>
                <p className="text-rose-200/80 mt-1 leading-relaxed">
                  City-wide shelter demand ({aggregateMetrics.totalDisplacedEvacuees.toLocaleString()} evacuees) has saturated or approached total designated holding capacity ({totalShelterCapacity.toLocaleString()} beds). Primary shelters are entering overflow state. Automatically initiating secondary dispersal protocols to Regional Stadiums and Kamrup Metropolitan Disaster Management reserves.
                </p>
              </div>
            </div>
          )}

          {/* 3. DESIGNATED RELIEF CAMPS & LIVE CAPACITY PROGRESS BARS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <span>Designated Guwahati Safe Havens (Live Capacity Tracking)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                DYNAMIC INTAKE VIA CONNECTED SECTORS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {reliefCamps.map((camp) => {
                const occupancyRate = (camp.currentOccupancy / camp.capacity) * 100;
                const isFull = camp.status === 'FULL';
                const isNear = camp.status === 'NEAR_CAPACITY';

                // Status badge styling according to required dynamic states:
                // < 70%: Emerald ("Available")
                // 70% - 99%: Amber ("High Occupancy")
                // >= 100%: Crimson ("Full - Diverting Influx")
                const badgeConfig = isFull
                  ? {
                      label: 'Full - Diverting Influx',
                      bg: 'bg-rose-950/90 text-rose-200 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse',
                      barBg: 'bg-rose-500',
                    }
                  : isNear
                  ? {
                      label: 'High Occupancy',
                      bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
                      barBg: 'bg-amber-500',
                    }
                  : {
                      label: 'Available',
                      bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
                      barBg: 'bg-emerald-500',
                    };

                // Check connected sectors' current flood levels
                const floodedConnectedSectors = camp.connectedSectors.filter(sectorName =>
                  cells.some(cell =>
                    (cell.name.toLowerCase().includes(sectorName.toLowerCase()) ||
                     cell.locality?.toLowerCase().includes(sectorName.toLowerCase())) &&
                    cell.waterDepth > 0.25
                  )
                );

                return (
                  <div
                    key={camp.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isFull
                        ? 'border-rose-500/50 bg-rose-950/15 shadow-sm shadow-rose-950/40'
                        : isNear
                        ? 'border-amber-500/40 bg-amber-950/10'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top row: Name, Elevation & Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                            <Tent className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>{camp.name}</span>
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-mono text-emerald-400 font-semibold">
                              Elev. {camp.elevation.toFixed(1)}m MSL
                            </span>
                            <span>•</span>
                            <span>Safe High Ground</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${badgeConfig.bg}`}
                        >
                          {badgeConfig.label}
                        </span>
                      </div>

                      {/* Live Capacity Progress Bar */}
                      <div className="space-y-1.5 my-3">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-slate-400 text-[11px]">Occupancy:</span>
                          <span className="font-mono font-bold text-white">
                            {camp.currentOccupancy.toLocaleString()}{' '}
                            <span className="text-slate-400 font-normal">
                              / {camp.capacity.toLocaleString()} beds
                            </span>{' '}
                            <span className={`text-[11px] ${isFull ? 'text-rose-400 font-bold' : isNear ? 'text-amber-400' : 'text-emerald-400'}`}>
                              ({occupancyRate.toFixed(1)}%)
                            </span>
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${badgeConfig.barBg}`}
                            style={{ width: `${Math.min(100, Math.max(2, occupancyRate))}%` }}
                          />
                        </div>
                      </div>

                      {/* Connected Sectors (Routed Catchments) */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Connected Inundation Catchments:</span>
                          {floodedConnectedSectors.length > 0 && (
                            <span className="text-rose-400 font-bold">
                              {floodedConnectedSectors.length} FLOODING
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {camp.connectedSectors.map(sector => {
                            const isFlooding = floodedConnectedSectors.includes(sector);
                            return (
                              <span
                                key={sector}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                  isFlooding
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold'
                                    : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                                }`}
                              >
                                {sector}
                                {isFlooding && ' ⚠️'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/70">
                      <Button
                        size="xs"
                        variant={isFull ? 'destructive' : 'cyan'}
                        onClick={() => {
                          // Order evacuation for all connected flooded cells
                          const connectedCells = cells.filter(cell =>
                            camp.connectedSectors.some(sector =>
                              cell.name.toLowerCase().includes(sector.toLowerCase()) ||
                              cell.locality?.toLowerCase().includes(sector.toLowerCase())
                            ) && cell.waterDepth > 0.25
                          );
                          connectedCells.forEach(cell => {
                            if (!cell.evacuationOrdered) toggleCellEvacuation(cell.id);
                          });
                          playTacticalAlertSound('action');
                        }}
                        className="text-[10px] font-mono h-7 flex-1"
                      >
                        <Route className="h-3 w-3 mr-1" />
                        <span>Dispatch Route Intake</span>
                      </Button>

                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          // Select the first connected cell on the map
                          const connectedCell = cells.find(cell =>
                            camp.connectedSectors.some(sector =>
                              cell.name.toLowerCase().includes(sector.toLowerCase()) ||
                              cell.locality?.toLowerCase().includes(sector.toLowerCase())
                            )
                          );
                          if (connectedCell) selectCell(connectedCell.id);
                          setActiveModal('none');
                        }}
                        className="text-[10px] font-mono h-7 text-slate-300 hover:text-white"
                      >
                        <MapPin className="h-3 w-3 mr-1 text-cyan-400" />
                        <span>View Catchment</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. INTERACTIVE SECTOR EVACUATION CLEARANCE QUEUE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                <span>Sectors Requiring Evacuation Clearance ({urgentEvacZones.length})</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                DYNAMIC WATER DEPTH &gt; 0.25m
              </span>
            </div>

            {urgentEvacZones.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200">No sectors currently breach mandatory evacuation thresholds.</p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Basin water depths are actively controlled within municipal retention ponds and drainage conduits.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {urgentEvacZones.map((cell) => {
                  const isCrit = cell.waterDepth >= 0.75 || cell.status === 'CRITICAL';
                  const destinationCamp = getDestinationCamp(cell);

                  return (
                    <div
                      key={cell.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isCrit
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          <Route className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs text-white">{cell.name}</h5>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                isCrit
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {isCrit ? 'CRITICAL DEPTH' : 'WARNING PONDING'}
                            </span>
                            {cell.evacuationOrdered && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                                EVAC IN PROGRESS
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>
                              Population: <strong className="text-slate-200">{cell.population.toLocaleString()}</strong>
                            </span>
                            <span>
                              Water Depth: <strong className="text-cyan-300">{cell.waterDepth.toFixed(2)}m</strong>
                            </span>
                            <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                              <ArrowRight className="h-3 w-3 text-slate-500" />
                              <Tent className="h-3 w-3 text-emerald-400" />
                              Destination: {destinationCamp.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          size="xs"
                          variant={cell.evacuationOrdered ? 'destructive' : 'secondary'}
                          onClick={() => {
                            toggleCellEvacuation(cell.id);
                            playTacticalAlertSound(cell.evacuationOrdered ? 'action' : 'critical');
                          }}
                          className="text-[10px] font-mono h-7"
                        >
                          {cell.evacuationOrdered ? 'Evac Ordered' : 'Issue Mandatory Evac'}
                        </Button>

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            selectCell(cell.id);
                            setActiveModal('none');
                          }}
                          className="text-[10px] font-mono h-7"
                        >
                          View Cell
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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 pt-3 gap-2 text-xs">
          <Button
            size="sm"
            variant="cyan"
            onClick={() => setActiveModal('rescue_camps')}
            className="text-xs font-bold gap-1.5"
          >
            <Tent className="h-3.5 w-3.5" />
            <span>Open Rescue Camp Command Center</span>
          </Button>

          <Button size="sm" variant="outline" onClick={() => setActiveModal('none')}>
            Close Advisor
          </Button>
        </div>
      </div>
    </div>
  );
};
