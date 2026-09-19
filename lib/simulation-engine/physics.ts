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

  // 2. Resolve Active GMDA Pumps Set
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

  // --- STEP 1: PRECIPITATION STEP ---
  // Add rainfall * factor to waterDepth of every cell
  const precFactor = 0.0035; // Scaled factor for tangible responsive feedback
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid2D[y][x];
      if (!cell) continue;

      // Higher orographic lift on southern Khasi foothills
      const orographic = cell.elevation > 70 ? 1.30 : cell.elevation > 55 ? 1.15 : 1.0;
      const addedWater = rainfall > 0 ? (rainfall * precFactor) * orographic : 0;
      const baseDepth = cell.waterDepth ?? cell.currentWaterLevel ?? 0;
      cell.waterDepth = baseDepth + addedWater;
    }
  }

  // --- STEP 2: INFILTRATION / DRAINAGE STEP ---
  // Subtract drainage based on proximity to 5 channels or active GMDA pumps
  let totalDrainedVolume = 0;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid2D[y][x];
      if (!cell) continue;

      // Brahmaputra River receives water and maintains high river baseline
      if (cell.channel === 'Brahmaputra') {
        cell.waterDepth = Math.max(1.15, cell.waterDepth);
        continue;
      }

      let drainDepth = 0;

      // A. Channel Drainage (Bharalu, Bahini, Basistha, Mora Bharalu, Lakhimijan)
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

      if (isDirectChannel) {
        drainDepth += 0.055; // Channel conduit conveyance
      } else if (isAdjacentChannel) {
        drainDepth += 0.028; // Rapid storm run into adjacent channel
      }

      // B. GMDA Auto-Priming Dewatering Pump active extraction
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

      if (isDirectPump) {
        drainDepth += 0.080; // Powerful localized suction
      } else if (isAdjacentPump) {
        drainDepth += 0.038; // Surrounding depression drawdown
      }

      // C. Permeability Soil Infiltration
      const soilInfil = (cell.permeability || 0.12) * 0.018;
      drainDepth += soilInfil;

      // Apply drainage subtraction
      const actualDrain = Math.min(cell.waterDepth, drainDepth);
      cell.waterDepth = Math.max(0, cell.waterDepth - actualDrain);
      totalDrainedVolume += actualDrain * CELL_AREA_SQ_METERS;

      // Deepor Beel natural wetland baseline
      if (cell.infrastructure === 'wetland') {
        cell.waterDepth = Math.max(0.45, cell.waterDepth);
      }
    }
  }

  // --- STEP 3: FLOW STEP (CELLULAR AUTOMATA) ---
  // For each cell, compare total height (elevation + waterDepth) with 4 orthogonal neighbors
  // and move a portion of excess water to adjacent lower-elevation cells.
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

  // --- STEP 4: TELEMETRY SYNC & METRIC RECALCULATION ---
  let floodedArea = 0; // count of cells where waterDepth > 0.1m
  let floodedAreaSqKm = 0;
  let affectedResidents = 0;
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

      // Rate of water change
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
      if (cell.waterDepth > maxWaterDepth) maxWaterDepth = cell.waterDepth;

      // Alert classification: Safe (<0.25m), Warning (0.25m - 0.75m), Critical (>=0.75m)
      let status: AlertLevel = 'SAFE';
      if (cell.waterDepth >= criticalThreshold) {
        status = 'CRITICAL';
        criticalZoneCount++;
        affectedResidents += cell.population;
      } else if (cell.waterDepth >= warningThreshold) {
        status = 'WARNING';
        warningZoneCount++;
        affectedResidents += Math.round(cell.population * 0.6);
      }
      cell.status = status;

      // Flooded area: cells where waterDepth > 0.1m
      if (cell.waterDepth > 0.10 && cell.channel !== 'Brahmaputra') {
        floodedArea++;
        floodedAreaSqKm += (CELL_AREA_SQ_METERS / 1_000_000);
      }

      // Time to critical calculation (minutes)
      if (status === 'CRITICAL') {
        cell.timeToCriticalMinutes = 0;
      } else if (cell.waterLevelDelta > 0.0005) {
        const remaining = criticalThreshold - cell.waterDepth;
        const estMinutes = remaining / cell.waterLevelDelta;
        cell.timeToCriticalMinutes = (estMinutes > 0 && estMinutes <= 180) ? Math.round(estMinutes) : null;
      } else {
        cell.timeToCriticalMinutes = null;
      }

      nextGrid.push(cell);
    }
  }

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
    bahiniBharaluFlowM3S: parseFloat(Math.max(12.0, bahiniBharaluFlowAccum).toFixed(1)),
    activePumpsCount: activePumpSet.size,
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
