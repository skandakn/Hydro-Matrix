/**
 * HYDRO MATRIX: 2D Shallow Water & Diffusive Wave Physics Engine
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Incorporates:
 * 1. 2D Shallow Water overland continuity and Manning hydraulic head gradients
 * 2. Receiving river boundary: The Brahmaputra River at northern boundary
 * 3. Bharalumukh Sluice Gate discharge physics (open vs closed vs river backflow)
 * 4. Active GMDA 20 Auto-Priming Dewatering Pump station volumetric discharges
 * 5. Dynamic Time-to-Critical early warning calculations (tau_crit in minutes)
 */

import { GridNode, SimulationConfig, AlertLevel } from '@/types/simulation';
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE_METERS, CELL_AREA_SQ_METERS, GMDA_PUMP_STATIONS } from './cityGrid';

export interface PhysicsStepResult {
  nextGrid: GridNode[];
  floodedAreaSqKm: number;
  affectedPopulation: number;
  criticalZoneCount: number;
  warningZoneCount: number;
  maxWaterDepth: number;
  maxFlowVelocity: number;
  totalDrainedVolume: number;
  bahiniBharaluFlowM3S: number;
  activePumpsCount: number;
}

export function stepSimulationPhysics(
  currentGrid: GridNode[],
  config: SimulationConfig,
  activePumpIds?: Set<string>
): PhysicsStepResult {
  const dt = config.timeStepSeconds; // Timestep in seconds (typically 30s - 60s)
  const dtHours = dt / 3600;
  const dtMinutes = dt / 60;
  const n = config.surfaceRoughness; // Manning's n (0.035 - 0.050)
  const rainDepthPerStep = (config.rainfallIntensity / 1000) * dtHours; // In meters

  const getIndex = (x: number, y: number) => y * GRID_WIDTH + x;

  // Build pump lookup by coordinate
  const pumpLookup = new Map<string, number>();
  let activePumpsCount = 0;
  for (const pump of GMDA_PUMP_STATIONS) {
    const isArmed = activePumpIds ? activePumpIds.has(pump.id) : pump.status === 'ACTIVE';
    if (isArmed) {
      activePumpsCount++;
      const coordKey = `${pump.gridX}-${pump.gridY}`;
      const curCap = pumpLookup.get(coordKey) || 0;
      pumpLookup.set(coordKey, curCap + pump.capacityM3Hr);
    }
  }

  // Clone nodes for next-state buffer
  const nextNodes: GridNode[] = currentGrid.map(node => ({
    ...node,
    waterLevelDelta: 0,
    inflowRate: 0,
    outflowRate: 0,
  }));

  // Step 1: Precipitation, Soil Infiltration, Engineered Drains, and GMDA Dewatering Pumps
  let totalDrainedVolume = 0;

  for (let i = 0; i < nextNodes.length; i++) {
    const node = nextNodes[i];

    // Add rainfall (higher on southern Khasi foothills due to orographic lift)
    const orographicMultiplier = node.elevation > 70 ? 1.25 : node.elevation > 55 ? 1.10 : 1.0;
    let h = node.currentWaterLevel + rainDepthPerStep * orographicMultiplier;

    // Engineered municipal drainage
    const drainMultiplier = config.drainageSystemEfficiency * (node.drainBlocked ? 0.05 : 1.0);
    const maxDrainDepthStep = (node.drainageCapacity * drainMultiplier / 1000) * dtHours;
    const actualDrainDepth = Math.min(h, maxDrainDepthStep);
    h -= actualDrainDepth;
    totalDrainedVolume += actualDrainDepth * CELL_AREA_SQ_METERS;

    // GMDA Auto-Priming Dewatering Pump active extraction
    const pumpCapM3Hr = pumpLookup.get(`${node.x}-${node.y}`) || 0;
    if (pumpCapM3Hr > 0 && h > 0.05) {
      const pumpDischargeM3 = (pumpCapM3Hr * drainMultiplier / 3600) * dt;
      const pumpDepthStep = pumpDischargeM3 / CELL_AREA_SQ_METERS;
      const actualPumpDrain = Math.min(h, pumpDepthStep);
      h -= actualPumpDrain;
      totalDrainedVolume += actualPumpDrain * CELL_AREA_SQ_METERS;
    }

    // Soil percolation & wetland retention
    const infiltrationStep = (node.permeability * config.soilAbsorptionRate / 1000) * dtHours;
    const actualInfiltration = Math.min(h, infiltrationStep);
    h -= actualInfiltration;

    // Brahmaputra perennial baseline maintenance
    if (node.channel === 'Brahmaputra') {
      h = Math.max(1.10, h);
    }

    node.currentWaterLevel = Math.max(0, h);
    node.effectiveDrainage = parseFloat((node.drainageCapacity * drainMultiplier).toFixed(1));
  }

  // Step 2: Surface Hydraulic Head Calculation
  const headLevels = new Float64Array(nextNodes.length);
  for (let i = 0; i < nextNodes.length; i++) {
    const node = nextNodes[i];
    const barrierOffset = node.barrierActive ? node.barrierHeight : 0;
    headLevels[i] = node.elevation + node.currentWaterLevel + barrierOffset;
  }

  const deltaWaterDepth = new Float64Array(nextNodes.length);
  const flowSpeeds = new Float64Array(nextNodes.length);
  const velocityVectors: Array<{ vx: number; vy: number }> = new Array(nextNodes.length);

  const neighbors = [
    { dx: 0, dy: -1 }, // North (towards Brahmaputra)
    { dx: 0, dy: 1 },  // South (from Khasi hills)
    { dx: -1, dy: 0 }, // West (towards Deepor Beel)
    { dx: 1, dy: 0 },  // East (from Dispur/Khanapara)
  ];

  let bahiniBharaluFlowAccum = 0;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const idx = getIndex(x, y);
      const sourceNode = nextNodes[idx];
      const sourceHead = headLevels[idx];
      const sourceWater = sourceNode.currentWaterLevel;

      let sumOutboundFlow = 0;
      const potentialOutflows: Array<{ targetIdx: number; fluxDepth: number; vx: number; vy: number }> = [];

      // Bharalumukh Sluice Gate outfall to Brahmaputra (at x:5, y:2 discharging north to y:1)
      if (x === 5 && y === 2) {
        const brahmaputraHead = config.brahmaputraFloodStageMeters || 48.5;
        // If sluice gate is closed or Brahmaputra is in spate
        if (!config.sluiceGateOpen || brahmaputraHead > sourceHead) {
          // Outflow choked! Backwater pooling occurs in Bharalu channel
        } else if (sourceWater > 0.02) {
          const sluiceSlope = Math.max(0.001, (sourceHead - brahmaputraHead) / CELL_SIZE_METERS);
          const sluiceVelocity = (1 / n) * Math.pow(Math.min(sourceWater, 1.5), 2/3) * Math.sqrt(sluiceSlope);
          const sluiceOutflow = Math.min(sourceWater * 0.40, (sluiceVelocity * sourceWater * dt) / CELL_SIZE_METERS);
          sumOutboundFlow += sluiceOutflow;
          potentialOutflows.push({ targetIdx: -1, fluxDepth: sluiceOutflow, vx: 0, vy: -sluiceVelocity });
        }
      }

      // Check 4 adjacent orthogonal cells
      for (const { dx, dy } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          const targetIdx = getIndex(nx, ny);
          const targetHead = headLevels[targetIdx];
          const headDiff = sourceHead - targetHead;

          // Water flows downhill along negative hydraulic head gradient
          if (headDiff > 0.004 && sourceWater > 0.002) {
            const slope = headDiff / CELL_SIZE_METERS;
            const rh = Math.min(sourceWater, headDiff);
            const velocity = (1 / n) * Math.pow(rh, 2/3) * Math.sqrt(Math.max(0.00001, slope));
            const rawFlux = (velocity * rh * dt) / CELL_SIZE_METERS;

            potentialOutflows.push({
              targetIdx,
              fluxDepth: rawFlux,
              vx: dx * velocity,
              vy: dy * velocity,
            });
            sumOutboundFlow += rawFlux;

            // Track discharge through Bahini/Bharalu corridor
            if (sourceNode.channel === 'Bharalu' || sourceNode.channel === 'Bahini') {
              bahiniBharaluFlowAccum += (velocity * rh * CELL_SIZE_METERS);
            }
          }
        }
      }

      // Courant–Friedrichs–Lewy (CFL) numerical limiter
      const maxAllowableOutflow = sourceWater * 0.45;
      const damping = sumOutboundFlow > maxAllowableOutflow && sumOutboundFlow > 0
        ? maxAllowableOutflow / sumOutboundFlow
        : 1.0;

      let netVx = 0;
      let netVy = 0;

      for (const flow of potentialOutflows) {
        const actualFlux = flow.fluxDepth * damping;
        deltaWaterDepth[idx] -= actualFlux;
        sourceNode.outflowRate += (actualFlux * CELL_AREA_SQ_METERS) / dt;

        if (flow.targetIdx !== -1) {
          deltaWaterDepth[flow.targetIdx] += actualFlux;
          nextNodes[flow.targetIdx].inflowRate += (actualFlux * CELL_AREA_SQ_METERS) / dt;
        }

        netVx += flow.vx * damping;
        netVy += flow.vy * damping;
      }

      const speed = Math.sqrt(netVx * netVx + netVy * netVy);
      flowSpeeds[idx] = speed;
      velocityVectors[idx] = { vx: netVx, vy: netVy };
    }
  }

  // Step 3: Apply net transfers, compute Guwahati classifications & early warnings
  let floodedAreaSqKm = 0;
  let affectedPopulation = 0;
  let criticalZoneCount = 0;
  let warningZoneCount = 0;
  let maxWaterDepth = 0;
  let maxFlowVelocity = 0;

  for (let i = 0; i < nextNodes.length; i++) {
    const node = nextNodes[i];
    const prevWaterLevel = currentGrid[i].currentWaterLevel;

    // Apply net water depth update
    const updatedWaterLevel = Math.max(0, node.currentWaterLevel + deltaWaterDepth[i]);
    node.currentWaterLevel = parseFloat(updatedWaterLevel.toFixed(3));
    node.totalElevation = parseFloat((node.elevation + node.currentWaterLevel).toFixed(3));

    // Rate of change dh/dt
    const deltaMeters = node.currentWaterLevel - prevWaterLevel;
    node.waterLevelDelta = parseFloat((deltaMeters / dtMinutes).toFixed(4));

    // Flow velocity vector
    const vec = velocityVectors[i] || { vx: 0, vy: 0 };
    const spd = flowSpeeds[i] || 0;
    node.flowVector = {
      vx: parseFloat(vec.vx.toFixed(3)),
      vy: parseFloat(vec.vy.toFixed(3)),
      speed: parseFloat(spd.toFixed(3)),
    };

    if (spd > maxFlowVelocity) maxFlowVelocity = spd;
    if (node.currentWaterLevel > maxWaterDepth) maxWaterDepth = node.currentWaterLevel;

    // Classification
    let status: AlertLevel = 'SAFE';
    if (node.currentWaterLevel >= config.criticalThreshold) {
      status = 'CRITICAL';
      criticalZoneCount++;
      affectedPopulation += node.population;
    } else if (node.currentWaterLevel >= config.warningThreshold) {
      status = 'WARNING';
      warningZoneCount++;
      affectedPopulation += Math.round(node.population * 0.6);
    }
    node.status = status;

    if (node.currentWaterLevel > 0.08 && node.channel !== 'Brahmaputra') {
      floodedAreaSqKm += (CELL_AREA_SQ_METERS / 1_000_000);
    }

    // Predictive Time to Critical calculation
    if (status === 'CRITICAL') {
      node.timeToCriticalMinutes = 0;
    } else if (node.waterLevelDelta > 0.0005) {
      const remainingDepth = config.criticalThreshold - node.currentWaterLevel;
      const ratePerMinute = node.waterLevelDelta;
      const estMinutes = remainingDepth / ratePerMinute;
      if (estMinutes > 0 && estMinutes <= 180) {
        node.timeToCriticalMinutes = Math.round(estMinutes);
      } else {
        node.timeToCriticalMinutes = null;
      }
    } else {
      node.timeToCriticalMinutes = null;
    }
  }

  return {
    nextGrid: nextNodes,
    floodedAreaSqKm: parseFloat(floodedAreaSqKm.toFixed(2)),
    affectedPopulation,
    criticalZoneCount,
    warningZoneCount,
    maxWaterDepth: parseFloat(maxWaterDepth.toFixed(2)),
    maxFlowVelocity: parseFloat(maxFlowVelocity.toFixed(2)),
    totalDrainedVolume: Math.round(totalDrainedVolume),
    bahiniBharaluFlowM3S: parseFloat((bahiniBharaluFlowAccum / 10).toFixed(1)),
    activePumpsCount,
  };
}
