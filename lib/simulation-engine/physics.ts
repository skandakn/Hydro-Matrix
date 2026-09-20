/**
 * HYDRO MATRIX: 2D Shallow Water & Cellular Automata Physics Engine
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Incorporates:
 * 1. Deterministic Cellular Automata flow step across 4 orthogonal neighbors
 * 2. Precipitation step adding rainfall * factor across the entire catchment
 * 3. Infiltration and drainage based on proximity to 5 government drainage channels
 *    (Bharalu, Bahini, Basistha, Mora Bharalu, Lakhimijan) and active 20 GMDA pumps
 * 4. Receiving water boundary: Brahmaputra River at northern boundary
 * 5. Dynamic Time-to-Critical early warning calculations (tau_crit in minutes)
 * 6. Telemetry sync for flooded area (cells > 0.1m) and affected population
 */

import { GridNode, SimulationConfig, AlertLevel } from '@/types/simulation';
import { GRID_WIDTH, GRID_HEIGHT, CELL_AREA_SQ_METERS, GMDA_PUMP_STATIONS } from './cityGrid';

export const GUWAHATI_MAX_POPULATION = 1500000; // 1.5 Million maximum metropolitan population
export const LOCAL_BASIN_POPULATION = 1050000;  // Bahini/Bharalu watershed basin demographic limit

export interface PhysicsStepResult {
  nextGrid: GridNode[];
  nextGrid2D: GridNode[][];
  floodedArea: number; // count of cells where waterDepth > 0.1m
  floodedAreaSqKm: number;
  affectedResidents: number;
  affectedPopulation: number;
  criticalZoneCount: number;
  warningZoneCount: number;
  maxWaterDepth: number;
  maxFlowVelocity: number;
  totalDrainedVolume: number;
  bahiniBharaluFlowM3S: number;
  activePumpsCount: number;
}

/**
 * Deterministic Simulation Step Function (Cellular Automata & Overland Hydrology)
 * Executed on frame ticks and immediately whenever rainfall slider or GMDA pumps change.
 */
export function runSimulationStep(
  currentGrid: GridNode[][] | GridNode[],
  rainfall: number,
  activePumps: number | Set<string>,
  config?: Partial<SimulationConfig>
): PhysicsStepResult {
  const criticalThreshold = config?.criticalThreshold ?? 0.75;
  const warningThreshold = config?.warningThreshold ?? 0.25;
  const drainageEfficiency = config?.drainageSystemEfficiency ?? 1.0;
  // Bharalumukh Sluice Gate State: true = State A (Open: Gravity Drainage Active), false = State B (Closed: Brahmaputra Backwater Barrier)
  const isSluiceOpen = config?.sluiceGateOpen !== false;

  // 1. Resolve 2D grid structure
  const is2D = Array.isArray(currentGrid) && Array.isArray(currentGrid[0]);
  const grid2D: GridNode[][] = is2D
    ? (currentGrid as GridNode[][]).map(row => row.map(cell => ({ ...cell })))
    : (() => {
        const flat = currentGrid as GridNode[];
        const res: GridNode[][] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const row: GridNode[] = [];
          for (let x = 0; x < GRID_WIDTH; x++) {
            res.push(row);
            const idx = y * GRID_WIDTH + x;
            if (flat[idx]) {
              row.push({ ...flat[idx] });
            }
          }
        }
        return res;
      })();

  // 2. Resolve Active GMDA Pumps Set & Scaling
  const activePumpSet = new Set<string>();
  if (activePumps instanceof Set) {
    activePumps.forEach(id => activePumpSet.add(id));
  } else if (typeof activePumps === 'number') {
    const count = Math.max(0, Math.min(GMDA_PUMP_STATIONS.length, activePumps));
    for (let i = 0; i < count; i++) {
      activePumpSet.add(GMDA_PUMP_STATIONS[i].id);
    }
  }

  // Pre-index active pumps by coordinates
  const pumpLocationMap = new Map<string, boolean>();
  for (const pump of GMDA_PUMP_STATIONS) {
    if (activePumpSet.has(pump.id)) {
      pumpLocationMap.set(`${pump.gridX}-${pump.gridY}`, true);
    }
  }

  const activePumpsCount = activePumpSet.size;
  const totalPumpsCount = GMDA_PUMP_STATIONS.length; // 20 units
  // Proportional scaling factor based on active units (0.0 to 1.0)
  const pumpScale = totalPumpsCount > 0 ? activePumpsCount / totalPumpsCount : 0;

  // --- STEP 1: PRECIPITATION INFLOW & DISCHARGE / DRAINAGE BALANCE ---
  let totalDrainedVolume = 0;
  const precFactor = 0.0020; // Calibrated factor: moderate rain (25 mm/h) produces ~0.050m inflow per tick

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid2D[y][x];
      if (!cell) continue;

      // Brahmaputra River receives arterial runoff and maintains high perennial river stage
      if (cell.channel === 'Brahmaputra') {
        cell.waterDepth = Math.max(1.15, cell.waterDepth);
        cell.currentWaterLevel = cell.waterDepth;
        continue;
      }

      // A. INFLOW FROM PRECIPITATION
      // Higher orographic lift on southern Khasi foothills
      const orographic = cell.elevation > 70 ? 1.30 : cell.elevation > 55 ? 1.15 : 1.0;
      const inflowFromRain = rainfall > 0 ? (rainfall * precFactor) * orographic : 0;

      // B. NATURAL DRAINAGE (Governed by Bharalumukh Sluice Gate State)
      const isDirectChannel = !!cell.channel;
      let isAdjacentChannel = false;
      if (!isDirectChannel) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < GRID_HEIGHT && nx >= 0 && nx < GRID_WIDTH) {
              const neighbor = grid2D[ny][nx];
              if (neighbor && neighbor.channel && neighbor.channel !== 'Brahmaputra') {
                isAdjacentChannel = true;
                break;
              }
            }
          }
          if (isAdjacentChannel) break;
        }
      }

      // River outlet points: Bharalumukh outfall (5, 2) & Lakhimijan outfall (2, 4)
      const isRiverOutlet = (x === 5 && y === 2) || (x === 2 && y === 4);

      let naturalDrainage = 0;
      if (isSluiceOpen) {
        // State A: Gate OPEN - Gravity Drainage Active
        // Outflow to the river increases significantly; water levels steadily drop or drain away quickly under moderate rain
        const riverOutflowRate = isRiverOutlet ? 0.090 : 0.0;
        const channelConveyance = isDirectChannel ? 0.070 : isAdjacentChannel ? 0.040 : 0.020;
        const soilInfil = (cell.permeability || 0.12) * 0.020;
        naturalDrainage = (channelConveyance + riverOutflowRate + soilInfil) * drainageEfficiency;
      } else {
        // State B: Gate CLOSED - Brahmaputra Backwater Barrier
        // Natural gravity discharge to the river outlet is blocked (river outflow rate = 0)
        // Water builds up and pools inside the city basin unless active pumps discharge it
        const riverOutflowRate = 0.0;
        const channelConveyance = isDirectChannel ? 0.005 : isAdjacentChannel ? 0.003 : 0.002;
        const soilInfil = (cell.permeability || 0.12) * 0.005;
        naturalDrainage = (channelConveyance + riverOutflowRate + soilInfil) * drainageEfficiency;
      }

      // Silt/debris blockage constraint
      if (cell.drainBlocked) {
        naturalDrainage *= 0.15;
      }

      // C. PUMP DISCHARGE RATE
      // When pumps are active (activePumps > 0), drainage scales proportionally with active units
      let pumpDischargeRate = 0;
      if (activePumpsCount > 0) {
        const isDirectPump = pumpLocationMap.has(`${x}-${y}`);
        let isAdjacentPump = false;
        if (!isDirectPump) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (pumpLocationMap.has(`${x + dx}-${y + dy}`)) {
                isAdjacentPump = true;
                break;
              }
            }
            if (isAdjacentPump) break;
          }
        }

        // Localized pump intake suction
        const localSuction = isDirectPump ? 0.160 : isAdjacentPump ? 0.080 : 0.0;
        // Low-lying basin bowl drainage (Anil Nagar, Nabin Nagar, Rukminigaon, Tarun Nagar, etc.)
        const isLowLyingOrFlooded = cell.elevation <= 53.5 || (cell.waterDepth ?? cell.currentWaterLevel ?? 0) > 0.01;
        // Basin-wide suction scaled proportionally with active units
        const basinSuction = isLowLyingOrFlooded ? (0.075 * pumpScale) : (0.030 * pumpScale);

        // When pumps are turned ON, pumpDischargeRate outpaces moderate rainfall (~0.050m)
        pumpDischargeRate = (localSuction + basinSuction) * drainageEfficiency;
      }

      // D. NET WATER CHANGE PER CELL
      // netChange = inflowFromRain - (naturalDrainage + pumpDischargeRate)
      const totalDischarge = naturalDrainage + pumpDischargeRate;
      const netChange = inflowFromRain - totalDischarge;

      const baseDepth = cell.waterDepth ?? cell.currentWaterLevel ?? 0;
      // When pumps are ON or Gate is OPEN with moderate rain, netChange is negative and waterDepth actively decreases
      const newWaterDepth = Math.max(0, baseDepth + netChange);
      const actualDrainedDepth = Math.max(0, (baseDepth + Math.max(0, inflowFromRain)) - newWaterDepth);
      totalDrainedVolume += actualDrainedDepth * CELL_AREA_SQ_METERS;

      cell.waterDepth = newWaterDepth;

      // Deepor Beel natural wetland baseline
      if (cell.infrastructure === 'wetland') {
        cell.waterDepth = Math.max(0.40, cell.waterDepth);
      }
    }
  }

  // --- STEP 2: FLOW STEP (CELLULAR AUTOMATA PROPAGATION) ---
  // Compare total hydraulic head (elevation + waterDepth + barrier) with 4 orthogonal neighbors
  const H: number[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const hRow: number[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid2D[y][x];
      const barrierOffset = cell.barrierActive ? (cell.barrierHeight || 1.0) : 0;
      hRow.push(cell.elevation + cell.waterDepth + barrierOffset);
    }
    H.push(hRow);
  }

  const deltaWater: number[][] = Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_WIDTH).fill(0));
  const flowVx: number[][] = Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_WIDTH).fill(0));
  const flowVy: number[][] = Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_WIDTH).fill(0));

  const orthogonalNeighbors = [
    { dy: -1, dx: 0 }, // North
    { dy: 1, dx: 0 },  // South
    { dy: 0, dx: -1 }, // West
    { dy: 0, dx: 1 },  // East
  ];

  let bahiniBharaluFlowAccum = 0;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid2D[y][x];
      const curH = H[y][x];
      const curWater = cell.waterDepth;

      if (curWater <= 0.002) continue;

      const lowerNeighbors: Array<{ ny: number; nx: number; diff: number; dx: number; dy: number }> = [];
      let totalDiff = 0;

      for (const { dy, dx } of orthogonalNeighbors) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < GRID_HEIGHT && nx >= 0 && nx < GRID_WIDTH) {
          const neighbor = grid2D[ny][nx];

          // Brahmaputra Backwater Barrier:
          // When Sluice Gate is CLOSED, hydraulic transfer between city channels and river is completely blocked
          const crossesRiverBoundary =
            (cell.channel === 'Brahmaputra' && neighbor.channel !== 'Brahmaputra') ||
            (cell.channel !== 'Brahmaputra' && neighbor.channel === 'Brahmaputra');
          if (!isSluiceOpen && crossesRiverBoundary) {
            continue;
          }

          const neighborH = H[ny][nx];
          const diff = curH - neighborH;
          if (diff > 0.003) {
            lowerNeighbors.push({ ny, nx, diff, dx, dy });
            totalDiff += diff;
          }
        }
      }

      if (lowerNeighbors.length > 0 && totalDiff > 0) {
        // Courant flux limiter: maximum 35% outbound water per step for numerical stability
        const maxOutbound = curWater * 0.35;
        for (const n of lowerNeighbors) {
          const proportion = n.diff / totalDiff;
          const transfer = Math.min(n.diff * 0.20, maxOutbound * proportion);

          deltaWater[y][x] -= transfer;
          deltaWater[n.ny][n.nx] += transfer;

          flowVx[y][x] += n.dx * transfer * 2.5;
          flowVy[y][x] += n.dy * transfer * 2.5;

          if (cell.channel === 'Bharalu' || cell.channel === 'Bahini') {
            bahiniBharaluFlowAccum += transfer * 12;
          }
        }
      }
    }
  }

  // --- STEP 3: TELEMETRY SYNC, BIDIRECTIONAL UPDATES & REALISTIC POPULATION CLAMPING ---
  let floodedArea = 0; // count of non-river cells where waterDepth > 0.1m
  let floodedAreaSqKm = 0;
  let criticalZoneCount = 0;
  let warningZoneCount = 0;
  let maxWaterDepth = 0;
  let maxFlowVelocity = 0;

  const nextGrid: GridNode[] = [];

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid2D[y][x];
      const prevDepth = cell.currentWaterLevel ?? cell.waterDepth;
      const updatedDepth = Math.max(0, cell.waterDepth + deltaWater[y][x]);

      cell.waterDepth = parseFloat(updatedDepth.toFixed(3));
      cell.currentWaterLevel = cell.waterDepth;
      cell.totalElevation = parseFloat((cell.elevation + cell.waterDepth).toFixed(3));
      cell.capacity = cell.channel ? 45.0 : 25.0;
      cell.drainageCapacity = cell.capacity;
      cell.channelType = cell.channel || 'none';

      // Rate of water change: negative when receding, positive when rising
      cell.waterLevelDelta = parseFloat((cell.waterDepth - prevDepth).toFixed(4));

      // Velocity vectors
      const vx = flowVx[y][x];
      const vy = flowVy[y][x];
      const speed = Math.sqrt(vx * vx + vy * vy);
      cell.flowVector = {
        vx: parseFloat(vx.toFixed(3)),
        vy: parseFloat(vy.toFixed(3)),
        speed: parseFloat(speed.toFixed(3)),
      };

      if (speed > maxFlowVelocity) maxFlowVelocity = speed;
      if (cell.channel !== 'Brahmaputra' && cell.waterDepth > maxWaterDepth) maxWaterDepth = cell.waterDepth;

      // Bidirectional Alert classification: Safe (<0.25m), Warning (0.25m - 0.75m), Critical (>=0.75m)
      let status: AlertLevel = 'SAFE';
      if (cell.channel === 'Brahmaputra') {
        status = 'SAFE';
      } else if (cell.waterDepth >= criticalThreshold) {
        status = 'CRITICAL';
        criticalZoneCount++;
      } else if (cell.waterDepth >= warningThreshold) {
        status = 'WARNING';
        warningZoneCount++;
      }
      cell.status = status;

      // Flooded area: cells where waterDepth > 0.10m (excluding perennial Brahmaputra River channel)
      if (cell.waterDepth > 0.10 && cell.channel !== 'Brahmaputra') {
        floodedArea++;
        floodedAreaSqKm += (CELL_AREA_SQ_METERS / 1_000_000);
      }

      // Dynamic Time to Critical calculation (minutes)
      if (status === 'CRITICAL') {
        cell.timeToCriticalMinutes = 0;
      } else if (cell.waterLevelDelta > 0.0005) {
        const remaining = criticalThreshold - cell.waterDepth;
        const estMinutes = remaining / cell.waterLevelDelta;
        cell.timeToCriticalMinutes = (estMinutes > 0 && estMinutes <= 180) ? Math.round(estMinutes) : null;
      } else {
        // Water is stable or actively receding: clear time to critical
        cell.timeToCriticalMinutes = null;
      }

      nextGrid.push(cell);
    }
  }

  // --- REALISTIC POPULATION CLAMPING (Issue 3) ---
  // Safe bounded calculation clamped to local watershed basin limit and hard-capped at GUWAHATI_MAX_POPULATION (1.5M)
  const totalBasinCells = GRID_WIDTH * (GRID_HEIGHT - 2); // 288 terrestrial populated basin cells
  const weightedFloodedScore = (
    criticalZoneCount * 1.0 +
    warningZoneCount * 0.6 +
    Math.max(0, floodedArea - criticalZoneCount - warningZoneCount) * 0.25
  );
  const floodedCellsRatio = Math.min(1.0, Math.max(0, weightedFloodedScore / totalBasinCells));
  const affectedResidents = Math.min(
    GUWAHATI_MAX_POPULATION,
    Math.round(floodedCellsRatio * LOCAL_BASIN_POPULATION)
  );

  // Bharalu River discharge telemetry:
  // State A (Gate OPEN): arterial gravity flow into Brahmaputra (12 - 85 m³/s)
  // State B (Gate CLOSED): gravity outflow blocked (0 m³/s); only mechanical pump discharge passes over barrier
  const bahiniBharaluFlowM3S = isSluiceOpen
    ? parseFloat(Math.max(12.0, Math.min(85.0, bahiniBharaluFlowAccum + (activePumpsCount * 1.5))).toFixed(1))
    : parseFloat((activePumpsCount * 1.8).toFixed(1));

  return {
    nextGrid,
    nextGrid2D: grid2D,
    floodedArea,
    floodedAreaSqKm: parseFloat(floodedAreaSqKm.toFixed(2)),
    affectedResidents,
    affectedPopulation: affectedResidents,
    criticalZoneCount,
    warningZoneCount,
    maxWaterDepth: parseFloat(maxWaterDepth.toFixed(2)),
    maxFlowVelocity: parseFloat(maxFlowVelocity.toFixed(2)),
    totalDrainedVolume: Math.round(totalDrainedVolume),
    bahiniBharaluFlowM3S,
    activePumpsCount,
  };
}

/**
 * Backward compatibility wrapper for stepSimulationPhysics
 */
export function stepSimulationPhysics(
  currentGrid: GridNode[],
  config: SimulationConfig,
  activePumpIds?: Set<string>
): PhysicsStepResult {
  const activeCount = activePumpIds ? activePumpIds : config.drainageSystemEfficiency > 0 ? 20 : 0;
  return runSimulationStep(currentGrid, config.rainfallIntensity, activeCount, config);
}
