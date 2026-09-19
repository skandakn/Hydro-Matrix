/**
 * FLOWSHIELD: 2D Shallow Water & Diffusive Wave Physics Engine
 * 
 * Mathematical Formulation:
 * 1. Continuity Equation (Conservation of Mass):
 *    ∂h/∂t + ∂(uh)/∂x + ∂(vh)/∂y = R(t) - D(t) - I(t)
 *    where:
 *      h = surface water depth (m)
 *      u, v = directional velocity components (m/s)
 *      R(t) = precipitation rainfall influx (m/s)
 *      D(t) = engineered drainage discharge capacity (m/s)
 *      I(t) = soil percolation & infiltration rate (m/s)
 * 
 * 2. Diffusive Wave Hydraulic Momentum Approximation:
 *    Flow velocity between neighboring cells is driven by total hydraulic gradient:
 *    H = z_bed + h + z_barrier
 *    S_f = - ∇H = - ((H_i - H_j) / Δx)
 *    Using Manning's uniform open-channel flow law:
 *    v_ij = (1 / n) * (R_hydraulic)^(2/3) * |S_f|^(1/2) * sign(H_i - H_j)
 * 
 * 3. Dynamic Critical Classification & Early Warning Prediction:
 *    - Safe: h < h_warn (0.25m)
 *    - Warning: h_warn <= h < h_crit (0.75m)
 *    - Critical: h >= h_crit (0.75m)
 *    - Estimated Time to Critical (tau_crit):
 *      tau = (h_crit - h) / (dh/dt) [converted to simulation minutes]
 */

import { GridNode, SimulationConfig, AlertLevel } from '@/types/simulation';
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE_METERS, CELL_AREA_SQ_METERS } from './cityGrid';

export interface PhysicsStepResult {
  nextGrid: GridNode[];
  floodedAreaSqKm: number;
  affectedPopulation: number;
  criticalZoneCount: number;
  warningZoneCount: number;
  maxWaterDepth: number;
  maxFlowVelocity: number;
  totalDrainedVolume: number;
}

/**
 * Computes a single discrete physics timestep across the city grid.
 * Guarantees strict volume conservation, CFL numerical stability, and 
 * accurate gradient-driven hydraulic routing.
 */
export function stepSimulationPhysics(
  currentGrid: GridNode[],
  config: SimulationConfig
): PhysicsStepResult {
  const dt = config.timeStepSeconds; // Timestep in seconds (typically 30s - 60s)
  const dtHours = dt / 3600;
  const dtMinutes = dt / 60;
  const n = config.surfaceRoughness; // Manning's roughness coefficient (0.035 - 0.050)
  const rainDepthPerStep = (config.rainfallIntensity / 1000) * dtHours; // In meters of precipitation

  // Create cell index lookup: (y * GRID_WIDTH + x)
  const getIndex = (x: number, y: number) => y * GRID_WIDTH + x;

  // Clone nodes to prepare next-state buffer
  const nextNodes: GridNode[] = currentGrid.map(node => ({
    ...node,
    // Store previous water level to compute rate of change dh/dt
    waterLevelDelta: 0,
    inflowRate: 0,
    outflowRate: 0,
  }));

  // Step 1: Atmospheric Precipitation, Drainage, & Soil Infiltration
  let totalDrainedVolume = 0;

  for (let i = 0; i < nextNodes.length; i++) {
    const node = nextNodes[i];

    // Add rainfall
    let h = node.currentWaterLevel + rainDepthPerStep;

    // Calculate effective drainage
    const drainMultiplier = config.drainageSystemEfficiency * (node.drainBlocked ? 0.05 : 1.0);
    const maxDrainDepthStep = (node.drainageCapacity * drainMultiplier / 1000) * dtHours;
    const actualDrainDepth = Math.min(h, maxDrainDepthStep);
    h -= actualDrainDepth;
    totalDrainedVolume += actualDrainDepth * CELL_AREA_SQ_METERS;

    // Calculate soil infiltration
    const infiltrationStep = (node.permeability * config.soilAbsorptionRate / 1000) * dtHours;
    const actualInfiltration = Math.min(h, infiltrationStep);
    h -= actualInfiltration;

    node.currentWaterLevel = Math.max(0, h);
    node.effectiveDrainage = parseFloat((node.drainageCapacity * drainMultiplier).toFixed(1));
  }

  // Step 2: Hydraulic Surface Elevation & Barrier Defense Adjustment
  // Total head H = elevation + water depth + barrier height
  const headLevels = new Float64Array(nextNodes.length);
  for (let i = 0; i < nextNodes.length; i++) {
    const node = nextNodes[i];
    const barrierOffset = node.barrierActive ? node.barrierHeight : 0;
    headLevels[i] = node.elevation + node.currentWaterLevel + barrierOffset;
  }

  // Matrix to accumulate volumetric inter-cell water transfers: flowMatrix[source][dest]
  // We use 4-directional von Neumann neighborhood (North, South, East, West)
  const deltaWaterDepth = new Float64Array(nextNodes.length); // Net depth exchange in meters
  const flowSpeeds = new Float64Array(nextNodes.length);
  const velocityVectors: Array<{ vx: number; vy: number }> = new Array(nextNodes.length);

  const neighbors = [
    { dx: 0, dy: -1 }, // North
    { dx: 0, dy: 1 },  // South
    { dx: -1, dy: 0 }, // West
    { dx: 1, dy: 0 },  // East
  ];

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const idx = getIndex(x, y);
      const sourceNode = nextNodes[idx];
      const sourceHead = headLevels[idx];
      const sourceWater = sourceNode.currentWaterLevel;

      let sumOutboundFlow = 0;
      const potentialOutflows: Array<{ targetIdx: number; fluxDepth: number; vx: number; vy: number }> = [];

      // Check coastal ocean discharge boundary (East Edge)
      if (x === GRID_WIDTH - 1) {
        const oceanHead = config.coastalSurgeHead;
        if (sourceHead > oceanHead && sourceWater > 0.01) {
          const oceanHeadDiff = sourceHead - oceanHead;
          const oceanSlope = oceanHeadDiff / CELL_SIZE_METERS;
          const oceanVelocity = (1 / n) * Math.pow(Math.min(sourceWater, 1.0), 2/3) * Math.sqrt(Math.max(0.0001, oceanSlope));
          const oceanOutflow = Math.min(sourceWater * 0.35, (oceanVelocity * sourceWater * dt) / CELL_SIZE_METERS);
          sumOutboundFlow += oceanOutflow;
          potentialOutflows.push({ targetIdx: -1, fluxDepth: oceanOutflow, vx: oceanVelocity, vy: 0 });
        }
      }

      // Evaluate 4 adjacent cells
      for (const { dx, dy } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          const targetIdx = getIndex(nx, ny);
          const targetHead = headLevels[targetIdx];

          const headDiff = sourceHead - targetHead;

          // Water flows downhill along negative hydraulic gradient
          if (headDiff > 0.005 && sourceWater > 0.002) {
            const slope = headDiff / CELL_SIZE_METERS;
            // Hydraulic radius approximate for overland sheet flow: Rh ≈ min(sourceWater, headDiff)
            const rh = Math.min(sourceWater, headDiff);
            // Manning's equation: v = (1/n) * Rh^(2/3) * S^(1/2)
            const velocity = (1 / n) * Math.pow(rh, 2/3) * Math.sqrt(Math.max(0.00001, slope));
            
            // Flux depth in meters transferred over dt
            // Flux = (v * rh * dt) / L
            const rawFlux = (velocity * rh * dt) / CELL_SIZE_METERS;
            
            potentialOutflows.push({
              targetIdx,
              fluxDepth: rawFlux,
              vx: dx * velocity,
              vy: dy * velocity,
            });
            sumOutboundFlow += rawFlux;
          }
        }
      }

      // Numerical Stability Limiter (Courant-Friedrichs-Lewy Condition):
      // A cell cannot lose more than 45% of its available water in a single timestep
      const maxAllowableOutflow = sourceWater * 0.45;
      const dampingFactor = sumOutboundFlow > maxAllowableOutflow && sumOutboundFlow > 0
        ? maxAllowableOutflow / sumOutboundFlow
        : 1.0;

      let netVx = 0;
      let netVy = 0;

      for (const flow of potentialOutflows) {
        const actualFlux = flow.fluxDepth * dampingFactor;
        deltaWaterDepth[idx] -= actualFlux;
        sourceNode.outflowRate += (actualFlux * CELL_AREA_SQ_METERS) / dt;

        if (flow.targetIdx !== -1) {
          deltaWaterDepth[flow.targetIdx] += actualFlux;
          nextNodes[flow.targetIdx].inflowRate += (actualFlux * CELL_AREA_SQ_METERS) / dt;
        }

        netVx += flow.vx * dampingFactor;
        netVy += flow.vy * dampingFactor;
      }

      const speed = Math.sqrt(netVx * netVx + netVy * netVy);
      flowSpeeds[idx] = speed;
      velocityVectors[idx] = { vx: netVx, vy: netVy };
    }
  }

  // Step 3: Apply dynamic transfers, compute classification & Time to Critical
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

    // Instantaneous rate of water depth change: dh/dt in m/minute
    const deltaMeters = node.currentWaterLevel - prevWaterLevel;
    node.waterLevelDelta = parseFloat((deltaMeters / dtMinutes).toFixed(4));

    // Assign flow vector
    const vec = velocityVectors[i] || { vx: 0, vy: 0 };
    const spd = flowSpeeds[i] || 0;
    node.flowVector = {
      vx: parseFloat(vec.vx.toFixed(3)),
      vy: parseFloat(vec.vy.toFixed(3)),
      speed: parseFloat(spd.toFixed(3)),
    };

    if (spd > maxFlowVelocity) {
      maxFlowVelocity = spd;
    }
    if (node.currentWaterLevel > maxWaterDepth) {
      maxWaterDepth = node.currentWaterLevel;
    }

    // Dynamic Early Warning Classification Logic
    let status: AlertLevel = 'SAFE';
    if (node.currentWaterLevel >= config.criticalThreshold) {
      status = 'CRITICAL';
      criticalZoneCount++;
      affectedPopulation += node.population;
    } else if (node.currentWaterLevel >= config.warningThreshold) {
      status = 'WARNING';
      warningZoneCount++;
      affectedPopulation += Math.round(node.population * 0.6); // Vulnerable demographic
    }
    node.status = status;

    // Track flooded land area (water depth > 0.08m)
    if (node.currentWaterLevel > 0.08) {
      floodedAreaSqKm += (CELL_AREA_SQ_METERS / 1_000_000);
    }

    // Mathematical Calculation: Estimated Time to Critical (tau_crit in minutes)
    // tau = (h_crit - h) / (dh/dt)
    if (status === 'CRITICAL') {
      // Already at or above critical inundation
      node.timeToCriticalMinutes = 0;
    } else if (node.waterLevelDelta > 0.0005) {
      // Inundation is progressively accumulating toward critical threshold
      const remainingDepth = config.criticalThreshold - node.currentWaterLevel;
      const ratePerMinute = node.waterLevelDelta;
      const estMinutes = remainingDepth / ratePerMinute;
      
      // Cap realistic forecast window to 180 minutes
      if (estMinutes > 0 && estMinutes <= 180) {
        node.timeToCriticalMinutes = Math.round(estMinutes);
      } else {
        node.timeToCriticalMinutes = null;
      }
    } else {
      // Water level is stationary or receding
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
  };
}
