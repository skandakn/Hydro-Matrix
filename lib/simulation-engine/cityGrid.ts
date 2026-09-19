/**
 * FLOWSHIELD: City Grid Geospatial Topography Generator
 * Constructs a topologically realistic metropolitan basin featuring:
 * - Natural elevation gradients (Northwest highlands down to Southeast coastal estuary)
 * - Meandering river/canal conveyance corridors
 * - High-density urban commercial cores, industrial hubs, and suburban sectors
 * - Strategic infrastructure nodes (Hospitals, Substations, Pump Stations, Evacuation Shelters)
 */

import { GridNode, InfrastructureType } from '@/types/simulation';

export const GRID_WIDTH = 18;
export const GRID_HEIGHT = 18;
export const CELL_SIZE_METERS = 250; // 250m x 250m per cell (grid represents a 4.5km x 4.5km metro region)
export const CELL_AREA_SQ_METERS = CELL_SIZE_METERS * CELL_SIZE_METERS; // 62,500 m²

interface DistrictSeed {
  name: string;
  baseElev: number;
  popDensity: number; // population per cell
  permeability: number; // 0.0 to 1.0
  drainageNominal: number; // m3/s equivalent
}

const DISTRICT_PROFILES: Record<string, DistrictSeed> = {
  highlands: { name: 'North Heights', baseElev: 32.0, popDensity: 1200, permeability: 0.55, drainageNominal: 25 },
  foothills: { name: 'West Valley Ridge', baseElev: 22.0, popDensity: 2400, permeability: 0.40, drainageNominal: 30 },
  downtown: { name: 'Downtown Central', baseElev: 7.5, popDensity: 8500, permeability: 0.08, drainageNominal: 45 },
  financial: { name: 'Financial Plaza', baseElev: 6.8, popDensity: 9200, permeability: 0.05, drainageNominal: 50 },
  industrial: { name: 'Harbor Industrial', baseElev: 3.2, popDensity: 1800, permeability: 0.12, drainageNominal: 40 },
  riverfront: { name: 'Riverside Walk', baseElev: 4.1, popDensity: 4500, permeability: 0.25, drainageNominal: 35 },
  southbasin: { name: 'South Metro Basin', baseElev: 2.1, popDensity: 6200, permeability: 0.15, drainageNominal: 35 },
  coastal: { name: 'East Estuary Delta', baseElev: 1.2, popDensity: 800, permeability: 0.70, drainageNominal: 60 },
  suburbs: { name: 'Emerald Suburbs', baseElev: 16.0, popDensity: 3100, permeability: 0.48, drainageNominal: 28 },
};

/**
 * Procedurally generates the metropolitan elevation and hydraulic profile
 */
export function generateCityGrid(): GridNode[] {
  const nodes: GridNode[] = [];

  // Define river path: curves from NW (x:2, y:0) down to SE (x:17, y:14)
  const isRiverCell = (x: number, y: number): boolean => {
    // Curvilinear polynomial river channel approximation
    const riverCenter = 0.04 * (y * y) + 0.6 * y + 2;
    return Math.abs(x - riverCenter) <= 0.9;
  };

  // Strategic critical infrastructure locations
  const infrastructureMap: Record<string, { type: InfrastructureType; name: string }> = {
    'cell-4-4': { type: 'hospital', name: 'St. Jude Central Hospital' },
    'cell-11-5': { type: 'hospital', name: 'Metro Trauma Center' },
    'cell-5-11': { type: 'substation', name: 'Grid Substation Alpha' },
    'cell-13-10': { type: 'substation', name: 'South Basin Power Grid' },
    'cell-3-8': { type: 'pumping_station', name: 'Canal Pump Station #1' },
    'cell-9-13': { type: 'pumping_station', name: 'Basin Main Storm Drain' },
    'cell-15-12': { type: 'pumping_station', name: 'Estuary Surge Discharge' },
    'cell-2-2': { type: 'shelter', name: 'Highland Evacuation Center' },
    'cell-12-2': { type: 'shelter', name: 'North Arena Emergency Shelter' },
    'cell-7-14': { type: 'evacuation_route', name: 'Interstate-80 Elevated Corridor' },
  };

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const id = `cell-${x}-${y}`;

      // 1. Calculate realistic base terrain elevation
      // Gradient descends from top-left (North-West) to bottom-right (South-East)
      const slopeFactor = ((GRID_WIDTH - x) / GRID_WIDTH) * 18 + ((GRID_HEIGHT - y) / GRID_HEIGHT) * 14;
      
      // Add geographical geological noise (hills and depressions)
      const hillNoise = Math.sin(x * 0.4) * 4.2 + Math.cos(y * 0.4) * 3.8;
      
      // Basin depression in lower central area (South Basin)
      const dxBasin = x - 10;
      const dyBasin = y - 12;
      const distBasinSq = dxBasin * dxBasin + dyBasin * dyBasin;
      const basinDepression = distBasinSq < 16 ? (16 - distBasinSq) * 0.45 : 0;

      let elevation = Math.max(0.8, slopeFactor + hillNoise - basinDepression);

      // Carve river channel into elevation
      const river = isRiverCell(x, y);
      if (river) {
        elevation = Math.max(0.6, elevation - 3.8); // Deep river bed
      }

      // Assign district profile based on coordinate zones
      let district: DistrictSeed;
      if (y < 4 && x < 8) {
        district = DISTRICT_PROFILES.highlands;
      } else if (y < 6 && x >= 8) {
        district = DISTRICT_PROFILES.suburbs;
      } else if (river) {
        district = DISTRICT_PROFILES.riverfront;
      } else if (distBasinSq < 18) {
        district = DISTRICT_PROFILES.southbasin;
      } else if (x >= 6 && x <= 13 && y >= 5 && y <= 10) {
        district = (x + y) % 2 === 0 ? DISTRICT_PROFILES.downtown : DISTRICT_PROFILES.financial;
      } else if (x >= 14 && y >= 11) {
        district = DISTRICT_PROFILES.coastal;
      } else if (x < 6 && y >= 8) {
        district = DISTRICT_PROFILES.foothills;
      } else {
        district = DISTRICT_PROFILES.industrial;
      }

      // Population variation
      const popJitter = 0.8 + ((x * 17 + y * 23) % 40) / 100;
      const population = Math.round(district.popDensity * popJitter);

      // Infrastructure placement
      const infra = infrastructureMap[id] || { type: null, name: undefined };

      // Initial cell node
      nodes.push({
        id,
        x,
        y,
        name: `${district.name} [${x},${y}]`,
        elevation: parseFloat(elevation.toFixed(2)),
        currentWaterLevel: river ? 0.20 : 0.0, // River has natural baseline flow
        totalElevation: parseFloat((elevation + (river ? 0.20 : 0.0)).toFixed(2)),
        drainageCapacity: district.drainageNominal,
        effectiveDrainage: district.drainageNominal,
        permeability: district.permeability,
        population,
        inflowRate: 0,
        outflowRate: 0,
        waterLevelDelta: 0,
        flowVector: { vx: 0, vy: 0, speed: 0 },
        status: 'SAFE',
        timeToCriticalMinutes: null,
        drainBlocked: false,
        barrierActive: false,
        barrierHeight: 1.0, // 1.0m protection when sandbags/barriers are deployed
        infrastructure: infra.type,
        infrastructureName: infra.name,
        evacuationOrdered: false,
      });
    }
  }

  return nodes;
}
