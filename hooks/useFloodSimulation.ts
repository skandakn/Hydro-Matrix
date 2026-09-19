/**
 * FLOWSHIELD: useFloodSimulation (Zustand State Store & Physics Loop Hook)
 * 
 * Manages:
 * - Frame-by-frame simulation tick execution
 * - Bidirectional timeline scrubbing (history buffer for forward/rewind time travel)
 * - Dynamic parameter modulation (rainfall, drainage capacity, soil permeability)
 * - Disaster injection (drainage failure, canal debris blockage, flash pulse)
 * - Civil defense actions (sandbag flood barriers, evacuation orders)
 * - Live telemetry aggregation for Recharts and crisis HUD
 */

'use client';

import { create } from 'zustand';
import {
  GridNode,
  SimulationConfig,
  SimulationSnapshot,
  DisasterEvent,
  DisasterType,
  TelemetryPoint,
  ScenarioComparisonRecord,
} from '@/types/simulation';
import { generateCityGrid } from '@/lib/simulation-engine/cityGrid';
import { stepSimulationPhysics } from '@/lib/simulation-engine/physics';
import { PRESET_SCENARIOS } from '@/lib/simulation-engine/scenarios';

const MAX_HISTORY_BUFFER = 400; // Stores up to ~6.5 hours of simulated crisis history

export interface FloodSimulationStore {
  // --- Simulation State ---
  grid: GridNode[];
  currentTick: number;
  maxRecordedTick: number;
  elapsedSeconds: number;
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1, 2, 5, 10
  activeScenarioId: string;
  config: SimulationConfig;

  // --- Telemetry & History ---
  history: SimulationSnapshot[];
  telemetryHistory: TelemetryPoint[];
  activeDisasters: DisasterEvent[];
  selectedCellId: string | null;

  // --- Aggregated Live Metrics ---
  floodedAreaSqKm: number;
  affectedPopulation: number;
  criticalZoneCount: number;
  warningZoneCount: number;
  maxWaterDepth: number;
  maxFlowVelocity: number;
  totalDrainedVolume: number;

  // --- Comparison Records ---
  comparisonData: ScenarioComparisonRecord[];

  // --- Actions ---
  startSimulation: () => void;
  pauseSimulation: () => void;
  togglePlayPause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToTick: (targetTick: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setRainfallIntensity: (mmPerHour: number) => void;
  setDrainageEfficiency: (efficiency: number) => void;
  setCriticalThreshold: (thresholdMeters: number) => void;
  loadScenario: (presetId: string) => void;
  resetSimulation: () => void;
  injectDisaster: (type: DisasterType) => void;
  removeDisaster: (disasterId: string) => void;
  toggleCellDrainageBlock: (cellId: string) => void;
  toggleCellBarrier: (cellId: string) => void;
  toggleCellEvacuation: (cellId: string) => void;
  selectCell: (cellId: string | null) => void;
  generateComparisonBenchmarks: () => void;
}

const DEFAULT_CONFIG: SimulationConfig = {
  rainfallIntensity: 22, // mm/hour
  timeStepSeconds: 60,   // 60 seconds of real-world storm evolution per tick
  speedMultiplier: 1,
  criticalThreshold: 0.75, // meters
  warningThreshold: 0.25,  // meters
  drainageSystemEfficiency: 1.0, // 100% capacity
  surfaceRoughness: 0.040,       // Manning's n
  soilAbsorptionRate: 18,        // mm/hour infiltration
  coastalSurgeHead: 0.0,         // meters
};

export const useFloodSimulation = create<FloodSimulationStore>((set, get) => {
  const initialGrid = generateCityGrid();

  const initialSnapshot: SimulationSnapshot = {
    tick: 0,
    elapsedSeconds: 0,
    grid: initialGrid,
    floodedAreaSqKm: 0.12,
    affectedPopulation: 0,
    criticalZoneCount: 0,
    warningZoneCount: 0,
    maxWaterDepth: 0.20,
    maxFlowVelocity: 0.15,
    totalDrainedVolume: 0,
    timestamp: Date.now(),
  };

  const initialTelemetry: TelemetryPoint = {
    timeLabel: '00:00',
    elapsedMinutes: 0,
    floodedAreaSqKm: 0.12,
    affectedPopulation: 0,
    criticalZones: 0,
    warningZones: 0,
    maxWaterDepth: 0.20,
    avgDrainageEfficiency: 100,
  };

  return {
    grid: initialGrid,
    currentTick: 0,
    maxRecordedTick: 0,
    elapsedSeconds: 0,
    isPlaying: false,
    playbackSpeed: 1,
    activeScenarioId: 'normal-rain',
    config: DEFAULT_CONFIG,
    history: [initialSnapshot],
    telemetryHistory: [initialTelemetry],
    activeDisasters: [],
    selectedCellId: null,
    floodedAreaSqKm: 0.12,
    affectedPopulation: 0,
    criticalZoneCount: 0,
    warningZoneCount: 0,
    maxWaterDepth: 0.20,
    maxFlowVelocity: 0.15,
    totalDrainedVolume: 0,
    comparisonData: [],

    startSimulation: () => set({ isPlaying: true }),
    pauseSimulation: () => set({ isPlaying: false }),
    togglePlayPause: () => set(state => ({ isPlaying: !state.isPlaying })),

    /**
     * Advances simulation by one physics timestep.
     * If currently scrubbing inside recorded history, reads from next historical snapshot.
     * Otherwise, executes a new physics step through the numerical engine.
     */
    stepForward: () => {
      const state = get();
      const nextTick = state.currentTick + 1;

      // Case A: User was viewing past history and is stepping forward through recorded frames
      if (nextTick <= state.maxRecordedTick && state.history[nextTick]) {
        const snap = state.history[nextTick];
        set({
          grid: snap.grid,
          currentTick: snap.tick,
          elapsedSeconds: snap.elapsedSeconds,
          floodedAreaSqKm: snap.floodedAreaSqKm,
          affectedPopulation: snap.affectedPopulation,
          criticalZoneCount: snap.criticalZoneCount,
          warningZoneCount: snap.warningZoneCount,
          maxWaterDepth: snap.maxWaterDepth,
          maxFlowVelocity: snap.maxFlowVelocity,
          totalDrainedVolume: snap.totalDrainedVolume,
        });
        return;
      }

      // Case B: Compute new physics timestep
      const physicsResult = stepSimulationPhysics(state.grid, state.config);
      const newElapsed = state.elapsedSeconds + state.config.timeStepSeconds;
      const elapsedMins = Math.floor(newElapsed / 60);
      const hours = Math.floor(elapsedMins / 60);
      const mins = elapsedMins % 60;
      const timeLabel = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      const newSnapshot: SimulationSnapshot = {
        tick: nextTick,
        elapsedSeconds: newElapsed,
        grid: physicsResult.nextGrid,
        floodedAreaSqKm: physicsResult.floodedAreaSqKm,
        affectedPopulation: physicsResult.affectedPopulation,
        criticalZoneCount: physicsResult.criticalZoneCount,
        warningZoneCount: physicsResult.warningZoneCount,
        maxWaterDepth: physicsResult.maxWaterDepth,
        maxFlowVelocity: physicsResult.maxFlowVelocity,
        totalDrainedVolume: physicsResult.totalDrainedVolume,
        timestamp: Date.now(),
      };

      const newTelemetryPoint: TelemetryPoint = {
        timeLabel,
        elapsedMinutes: elapsedMins,
        floodedAreaSqKm: physicsResult.floodedAreaSqKm,
        affectedPopulation: physicsResult.affectedPopulation,
        criticalZones: physicsResult.criticalZoneCount,
        warningZones: physicsResult.warningZoneCount,
        maxWaterDepth: physicsResult.maxWaterDepth,
        avgDrainageEfficiency: Math.round(state.config.drainageSystemEfficiency * 100),
      };

      // Maintain rolling history buffer
      const updatedHistory = [...state.history, newSnapshot];
      if (updatedHistory.length > MAX_HISTORY_BUFFER) {
        updatedHistory.shift();
      }

      // Keep up to 60 telemetry points for smooth charting
      const updatedTelemetry = [...state.telemetryHistory, newTelemetryPoint];
      if (updatedTelemetry.length > 60) {
        updatedTelemetry.shift();
      }

      set({
        grid: physicsResult.nextGrid,
        currentTick: nextTick,
        maxRecordedTick: nextTick,
        elapsedSeconds: newElapsed,
        floodedAreaSqKm: physicsResult.floodedAreaSqKm,
        affectedPopulation: physicsResult.affectedPopulation,
        criticalZoneCount: physicsResult.criticalZoneCount,
        warningZoneCount: physicsResult.warningZoneCount,
        maxWaterDepth: physicsResult.maxWaterDepth,
        maxFlowVelocity: physicsResult.maxFlowVelocity,
        totalDrainedVolume: physicsResult.totalDrainedVolume,
        history: updatedHistory,
        telemetryHistory: updatedTelemetry,
      });
    },

    stepBackward: () => {
      const state = get();
      if (state.currentTick <= 0) return;
      const prevTick = state.currentTick - 1;
      const snap = state.history[prevTick];
      if (snap) {
        set({
          grid: snap.grid,
          currentTick: snap.tick,
          elapsedSeconds: snap.elapsedSeconds,
          floodedAreaSqKm: snap.floodedAreaSqKm,
          affectedPopulation: snap.affectedPopulation,
          criticalZoneCount: snap.criticalZoneCount,
          warningZoneCount: snap.warningZoneCount,
          maxWaterDepth: snap.maxWaterDepth,
          maxFlowVelocity: snap.maxFlowVelocity,
          totalDrainedVolume: snap.totalDrainedVolume,
        });
      }
    },

    /**
     * Interactive Time Slider Scrubbing (Forward / Rewind)
     */
    jumpToTick: (targetTick: number) => {
      const state = get();
      const clampedTick = Math.max(0, Math.min(targetTick, state.maxRecordedTick));
      const snap = state.history[clampedTick];
      if (snap) {
        set({
          currentTick: snap.tick,
          grid: snap.grid,
          elapsedSeconds: snap.elapsedSeconds,
          floodedAreaSqKm: snap.floodedAreaSqKm,
          affectedPopulation: snap.affectedPopulation,
          criticalZoneCount: snap.criticalZoneCount,
          warningZoneCount: snap.warningZoneCount,
          maxWaterDepth: snap.maxWaterDepth,
          maxFlowVelocity: snap.maxFlowVelocity,
          totalDrainedVolume: snap.totalDrainedVolume,
        });
      }
    },

    setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

    setRainfallIntensity: (mmPerHour: number) => {
      set(state => ({
        config: { ...state.config, rainfallIntensity: mmPerHour },
      }));
    },

    setDrainageEfficiency: (efficiency: number) => {
      set(state => ({
        config: { ...state.config, drainageSystemEfficiency: efficiency },
      }));
    },

    setCriticalThreshold: (thresholdMeters: number) => {
      set(state => ({
        config: { ...state.config, criticalThreshold: thresholdMeters },
      }));
    },

    /**
     * Loads a pre-calibrated crisis scenario preset
     */
    loadScenario: (presetId: string) => {
      const preset = PRESET_SCENARIOS.find(p => p.id === presetId);
      if (!preset) return;

      const freshGrid = generateCityGrid();

      // Apply initial blocked coordinates if designated
      if (preset.blockedDrainCoordinates && preset.blockedDrainCoordinates.length > 0) {
        for (const coord of preset.blockedDrainCoordinates) {
          const target = freshGrid.find(n => n.x === coord.x && n.y === coord.y);
          if (target) {
            target.drainBlocked = true;
          }
        }
      }

      const freshSnapshot: SimulationSnapshot = {
        tick: 0,
        elapsedSeconds: 0,
        grid: freshGrid,
        floodedAreaSqKm: 0.12,
        affectedPopulation: 0,
        criticalZoneCount: 0,
        warningZoneCount: 0,
        maxWaterDepth: 0.20,
        maxFlowVelocity: 0.15,
        totalDrainedVolume: 0,
        timestamp: Date.now(),
      };

      set({
        isPlaying: false,
        activeScenarioId: preset.id,
        grid: freshGrid,
        currentTick: 0,
        maxRecordedTick: 0,
        elapsedSeconds: 0,
        history: [freshSnapshot],
        telemetryHistory: [{
          timeLabel: '00:00',
          elapsedMinutes: 0,
          floodedAreaSqKm: 0.12,
          affectedPopulation: 0,
          criticalZones: 0,
          warningZones: 0,
          maxWaterDepth: 0.20,
          avgDrainageEfficiency: Math.round(preset.drainageSystemEfficiency * 100),
        }],
        activeDisasters: [],
        config: {
          ...DEFAULT_CONFIG,
          rainfallIntensity: preset.rainfallIntensity,
          drainageSystemEfficiency: preset.drainageSystemEfficiency,
          coastalSurgeHead: preset.coastalSurgeHead,
        },
        floodedAreaSqKm: 0.12,
        affectedPopulation: 0,
        criticalZoneCount: 0,
        warningZoneCount: 0,
        maxWaterDepth: 0.20,
      });
    },

    resetSimulation: () => {
      const state = get();
      state.loadScenario(state.activeScenarioId);
    },

    /**
     * Disaster Injection Handlers
     */
    injectDisaster: (type: DisasterType) => {
      const state = get();
      const tick = state.currentTick;

      switch (type) {
        case 'DRAINAGE_FAILURE': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'DRAINAGE_FAILURE',
            title: 'Pump Grid Power Cascade Failure',
            description: 'Substation outage reduced municipal stormwater drainage capacity by 80%.',
            severity: 'CATASTROPHIC',
            appliedAtTick: tick,
            active: true,
          };
          set({
            config: { ...state.config, drainageSystemEfficiency: 0.20 },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        case 'CHANNEL_BLOCKAGE': {
          // Block downstream canal corridor
          const blockCoords = [
            { x: 7, y: 9 },
            { x: 8, y: 9 },
            { x: 7, y: 10 },
          ];
          const updatedGrid = state.grid.map(node => {
            const isMatch = blockCoords.some(c => c.x === node.x && c.y === node.y);
            return isMatch ? { ...node, drainBlocked: true } : node;
          });
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'CHANNEL_BLOCKAGE',
            title: 'Debris Dam / Canal Choke',
            description: 'Major treefall and debris clog the primary canal conduit [x:7, y:9].',
            severity: 'SEVERE',
            appliedAtTick: tick,
            affectedCells: ['cell-7-9', 'cell-8-9', 'cell-7-10'],
            active: true,
          };
          set({
            grid: updatedGrid,
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        case 'CLOUDBURST_SPIKE': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'CLOUDBURST_SPIKE',
            title: 'Sudden Mesoscale Cloudburst',
            description: 'Precipitation spiked to 180 mm/h over the central catchment.',
            severity: 'CATASTROPHIC',
            appliedAtTick: tick,
            active: true,
          };
          set({
            config: { ...state.config, rainfallIntensity: 180 },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        case 'STORM_SURGE_BREACH': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'STORM_SURGE_BREACH',
            title: 'Coastal Tidal Sea Surge',
            description: 'Estuary boundary sea head surged to +1.4m, repelling river outflow.',
            severity: 'SEVERE',
            appliedAtTick: tick,
            active: true,
          };
          set({
            config: { ...state.config, coastalSurgeHead: 1.4 },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }
      }
    },

    removeDisaster: (disasterId: string) => {
      const state = get();
      const disaster = state.activeDisasters.find(d => d.id === disasterId);
      if (!disaster) return;

      // Revert parameters based on disaster type
      if (disaster.type === 'DRAINAGE_FAILURE') {
        set({ config: { ...state.config, drainageSystemEfficiency: 1.0 } });
      } else if (disaster.type === 'CHANNEL_BLOCKAGE' && disaster.affectedCells) {
        const updatedGrid = state.grid.map(node =>
          disaster.affectedCells!.includes(node.id) ? { ...node, drainBlocked: false } : node
        );
        set({ grid: updatedGrid });
      } else if (disaster.type === 'CLOUDBURST_SPIKE') {
        set({ config: { ...state.config, rainfallIntensity: 35 } });
      } else if (disaster.type === 'STORM_SURGE_BREACH') {
        set({ config: { ...state.config, coastalSurgeHead: 0.0 } });
      }

      set({
        activeDisasters: state.activeDisasters.filter(d => d.id !== disasterId),
      });
    },

    toggleCellDrainageBlock: (cellId: string) => {
      set(state => ({
        grid: state.grid.map(node =>
          node.id === cellId ? { ...node, drainBlocked: !node.drainBlocked } : node
        ),
      }));
    },

    toggleCellBarrier: (cellId: string) => {
      set(state => ({
        grid: state.grid.map(node =>
          node.id === cellId ? { ...node, barrierActive: !node.barrierActive } : node
        ),
      }));
    },

    toggleCellEvacuation: (cellId: string) => {
      set(state => ({
        grid: state.grid.map(node =>
          node.id === cellId ? { ...node, evacuationOrdered: !node.evacuationOrdered } : node
        ),
      }));
    },

    selectCell: (cellId: string | null) => {
      set({ selectedCellId: cellId });
    },

    /**
     * Fast-forward benchmark runs across all scenario presets to provide
     * side-by-side comparative telemetry curves in the Comparison modal!
     */
    generateComparisonBenchmarks: () => {
      const records: ScenarioComparisonRecord[] = PRESET_SCENARIOS.map(preset => {
        let simGrid = generateCityGrid();
        if (preset.blockedDrainCoordinates) {
          for (const coord of preset.blockedDrainCoordinates) {
            const target = simGrid.find(n => n.x === coord.x && n.y === coord.y);
            if (target) target.drainBlocked = true;
          }
        }

        const simConfig: SimulationConfig = {
          ...DEFAULT_CONFIG,
          rainfallIntensity: preset.rainfallIntensity,
          drainageSystemEfficiency: preset.drainageSystemEfficiency,
          coastalSurgeHead: preset.coastalSurgeHead,
        };

        const dataPoints: TelemetryPoint[] = [];
        let peakArea = 0;
        let peakPop = 0;
        let peakDepth = 0;
        let timeToFirstCrit: number | null = null;
        let compromisedInfra = 0;

        // Run 15 fast ticks (representing 15 simulated minutes each, total ~3.5 hours)
        for (let t = 0; t <= 20; t++) {
          const stepRes = stepSimulationPhysics(simGrid, simConfig);
          simGrid = stepRes.nextGrid;
          
          if (stepRes.floodedAreaSqKm > peakArea) peakArea = stepRes.floodedAreaSqKm;
          if (stepRes.affectedPopulation > peakPop) peakPop = stepRes.affectedPopulation;
          if (stepRes.maxWaterDepth > peakDepth) peakDepth = stepRes.maxWaterDepth;

          if (stepRes.criticalZoneCount > 0 && timeToFirstCrit === null) {
            timeToFirstCrit = t * 10;
          }

          const mins = t * 10;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          dataPoints.push({
            timeLabel: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            elapsedMinutes: mins,
            floodedAreaSqKm: stepRes.floodedAreaSqKm,
            affectedPopulation: stepRes.affectedPopulation,
            criticalZones: stepRes.criticalZoneCount,
            warningZones: stepRes.warningZoneCount,
            maxWaterDepth: stepRes.maxWaterDepth,
            avgDrainageEfficiency: Math.round(preset.drainageSystemEfficiency * 100),
          });
        }

        // Check compromised infrastructure
        for (const node of simGrid) {
          if (node.infrastructure && node.status === 'CRITICAL') {
            compromisedInfra++;
          }
        }

        return {
          scenarioId: preset.id,
          scenarioName: preset.name,
          peakFloodedAreaSqKm: peakArea,
          peakAffectedPopulation: peakPop,
          peakWaterDepth: peakDepth,
          timeToFirstCriticalMin: timeToFirstCrit,
          infrastructureCompromisedCount: compromisedInfra,
          dataPoints,
        };
      });

      set({ comparisonData: records });
    },
  };
});
