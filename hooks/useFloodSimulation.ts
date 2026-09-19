/**
 * HYDRO MATRIX: useFloodSimulation (Zustand State Store & Physics Loop Hook)
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - Deterministic Cellular Automata simulation loop: runSimulationStep()
 * - Real-time coupling: Catchment precipitation slider & 20 GMDA pump toggles
 *   immediately dispatch simulation step for instant visual feedback on canvas
 * - Global Simulation State:
 *   * rainfall: number (mm/h)
 *   * activePumps: number (0-20)
 *   * grid: 2D array of cells (grid[y][x]), each with { elevation, waterDepth, capacity, channelType }
 *   * isPlaying: boolean
 *   * tick: number
 *   * floodedArea: count of cells where waterDepth > 0.1m
 *   * affectedResidents: number
 * - Telemetry sync: live 18 AWS data feeds, 20 GMDA pump statuses & Recharts curves
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
  AutomaticWeatherStation,
  GMDAPumpStation,
} from '@/types/simulation';
import {
  generateCityGrid,
  generateCityGrid2D,
  GUWAHATI_AWS_STATIONS,
  GMDA_PUMP_STATIONS,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '@/lib/simulation-engine/cityGrid';
import { runSimulationStep as runSimulationStepPhysics } from '@/lib/simulation-engine/physics';
import { PRESET_SCENARIOS } from '@/lib/simulation-engine/scenarios';

const MAX_HISTORY_BUFFER = 400;

export interface FloodSimulationStore {
  // --- 1. Global Simulation State (Required by Specification) ---
  rainfall: number; // in mm/h, bound to the Catchment Precipitation slider
  activePumps: number; // count of active pumps, bound to 20 GMDA Auto-Priming Pumps
  grid: GridNode[][]; // 2D array of cells: grid[y][x], each containing { elevation, waterDepth, capacity, channelType }
  flatGrid: GridNode[]; // 1D array of cells for convenient linear iteration
  isPlaying: boolean;
  tick: number; // deterministic step counter
  floodedArea: number; // count of cells where waterDepth > 0.1m
  affectedResidents: number; // count of affected citizens

  // --- 2. Deterministic Physics Step Function ---
  runSimulationStep: () => void;

  // --- 3. Guwahati Real-World Hardware & Telemetry ---
  weatherStations: AutomaticWeatherStation[];
  gmdaPumps: GMDAPumpStation[];
  activePumpIds: Set<string>;
  bahiniBharaluFlowM3S: number;
  activePumpsCount: number;

  // --- 4. Existing Aliases & Metrics (Backwards Compatible) ---
  currentTick: number; // alias for tick
  maxRecordedTick: number;
  elapsedSeconds: number;
  playbackSpeed: number;
  activeScenarioId: string;
  config: SimulationConfig;

  history: SimulationSnapshot[];
  telemetryHistory: TelemetryPoint[];
  activeDisasters: DisasterEvent[];
  selectedCellId: string | null;

  floodedAreaSqKm: number;
  affectedPopulation: number; // alias for affectedResidents
  criticalZoneCount: number;
  warningZoneCount: number;
  maxWaterDepth: number;
  maxFlowVelocity: number;
  totalDrainedVolume: number;

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
  setBrahmaputraSluiceGate: (isOpen: boolean) => void;
  toggleGMDAPump: (pumpId: string) => void;
  setAllGMDAPumpsState: (active: boolean) => void;
  simulateGMDAPumpsFailure: () => void;
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
  rainfallIntensity: 25, // mm/hour
  timeStepSeconds: 60,
  speedMultiplier: 1,
  criticalThreshold: 0.75, // meters
  warningThreshold: 0.25,  // meters
  drainageSystemEfficiency: 1.0,
  surfaceRoughness: 0.042,
  soilAbsorptionRate: 15,
  coastalSurgeHead: 0.0,
  brahmaputraFloodStageMeters: 48.2,
  sluiceGateOpen: true,
};

export const useFloodSimulation = create<FloodSimulationStore>((set, get) => {
  const initialGrid2D = generateCityGrid2D();
  const initialFlat = initialGrid2D.flat();
  const initialPumps = [...GMDA_PUMP_STATIONS];
  const initialActivePumps = new Set<string>(initialPumps.map(p => p.id));
  const initialStations = [...GUWAHATI_AWS_STATIONS];

  const initialSnapshot: SimulationSnapshot = {
    tick: 0,
    elapsedSeconds: 0,
    grid: initialFlat,
    floodedAreaSqKm: 0.18,
    affectedPopulation: 0,
    criticalZoneCount: 0,
    warningZoneCount: 0,
    maxWaterDepth: 0.35,
    maxFlowVelocity: 0.22,
    totalDrainedVolume: 0,
    timestamp: Date.now(),
  };

  const initialTelemetry: TelemetryPoint = {
    timeLabel: '00:00',
    elapsedMinutes: 0,
    floodedAreaSqKm: 0.18,
    affectedPopulation: 0,
    criticalZones: 0,
    warningZones: 0,
    maxWaterDepth: 0.35,
    avgDrainageEfficiency: 100,
    bahiniBharaluFlowM3S: 32.5,
    activePumpsCount: 20,
  };

  return {
    // 1. Required Simulation State
    rainfall: 25,
    activePumps: 20,
    grid: initialGrid2D,
    flatGrid: initialFlat,
    isPlaying: false,
    tick: 0,
    floodedArea: 3,
    affectedResidents: 0,

    // Aliases & metrics
    currentTick: 0,
    maxRecordedTick: 0,
    elapsedSeconds: 0,
    playbackSpeed: 1,
    activeScenarioId: 'guwahati-monsoon',
    config: DEFAULT_CONFIG,

    weatherStations: initialStations,
    gmdaPumps: initialPumps,
    activePumpIds: initialActivePumps,
    bahiniBharaluFlowM3S: 32.5,
    activePumpsCount: 20,

    history: [initialSnapshot],
    telemetryHistory: [initialTelemetry],
    activeDisasters: [],
    selectedCellId: null,
    floodedAreaSqKm: 0.18,
    affectedPopulation: 0,
    criticalZoneCount: 0,
    warningZoneCount: 0,
    maxWaterDepth: 0.35,
    maxFlowVelocity: 0.22,
    totalDrainedVolume: 0,
    comparisonData: [],

    startSimulation: () => set({ isPlaying: true }),
    pauseSimulation: () => set({ isPlaying: false }),
    togglePlayPause: () => set(state => ({ isPlaying: !state.isPlaying })),

    /**
     * Deterministic Cellular Automata step execution
     */
    runSimulationStep: () => {
      const state = get();
      const nextTick = state.tick + 1;

      // Update simulated live AWS weather readings
      const updatedStations = state.weatherStations.map(station => {
        const jitter = Math.sin(nextTick * 0.3 + station.elevationMeters) * 4.0;
        const rain = Math.max(0, state.rainfall * (station.elevationMeters > 60 ? 1.25 : 1.0) + jitter);
        const acc = station.accumulatedRainfall24hMm + (rain / 60);
        return {
          ...station,
          rainfallMmHr: parseFloat(rain.toFixed(1)),
          accumulatedRainfall24hMm: parseFloat(acc.toFixed(1)),
          lastPing: 'Just now',
        };
      });

      // Execute deterministic Cellular Automata physics step
      const result = runSimulationStepPhysics(
        state.grid,
        state.rainfall,
        state.activePumpIds,
        state.config
      );

      const newElapsed = state.elapsedSeconds + state.config.timeStepSeconds;
      const elapsedMins = Math.floor(newElapsed / 60);
      const hours = Math.floor(elapsedMins / 60);
      const mins = elapsedMins % 60;
      const timeLabel = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      // Update pump operational metrics
      const updatedPumps: GMDAPumpStation[] = state.gmdaPumps.map(pump => {
        const isArmed = state.activePumpIds.has(pump.id);
        const cell = result.nextGrid.find(n => n.x === pump.gridX && n.y === pump.gridY);
        const hasWater = cell ? cell.waterDepth >= pump.waterLevelTriggerMeters : false;
        const pumpStatus: 'ACTIVE' | 'STANDBY' | 'FAILED' | 'OFFLINE' = !isArmed
          ? 'OFFLINE'
          : hasWater
          ? 'ACTIVE'
          : 'STANDBY';
        return {
          ...pump,
          status: pumpStatus,
          dischargeM3Hr: isArmed && hasWater ? Math.round(pump.capacityM3Hr * (0.9 + Math.random() * 0.1)) : 0,
        };
      });

      const newSnapshot: SimulationSnapshot = {
        tick: nextTick,
        elapsedSeconds: newElapsed,
        grid: result.nextGrid,
        floodedAreaSqKm: result.floodedAreaSqKm,
        affectedPopulation: result.affectedResidents,
        criticalZoneCount: result.criticalZoneCount,
        warningZoneCount: result.warningZoneCount,
        maxWaterDepth: result.maxWaterDepth,
        maxFlowVelocity: result.maxFlowVelocity,
        totalDrainedVolume: result.totalDrainedVolume,
        timestamp: Date.now(),
      };

      const newTelemetryPoint: TelemetryPoint = {
        timeLabel,
        elapsedMinutes: elapsedMins,
        floodedAreaSqKm: result.floodedAreaSqKm,
        affectedPopulation: result.affectedResidents,
        criticalZones: result.criticalZoneCount,
        warningZones: result.warningZoneCount,
        maxWaterDepth: result.maxWaterDepth,
        avgDrainageEfficiency: Math.round(state.config.drainageSystemEfficiency * 100),
        bahiniBharaluFlowM3S: result.bahiniBharaluFlowM3S,
        activePumpsCount: result.activePumpsCount,
      };

      const updatedHistory = [...state.history, newSnapshot];
      if (updatedHistory.length > MAX_HISTORY_BUFFER) updatedHistory.shift();

      const updatedTelemetry = [...state.telemetryHistory, newTelemetryPoint];
      if (updatedTelemetry.length > 60) updatedTelemetry.shift();

      set({
        grid: result.nextGrid2D,
        flatGrid: result.nextGrid,
        tick: nextTick,
        currentTick: nextTick,
        maxRecordedTick: Math.max(state.maxRecordedTick, nextTick),
        elapsedSeconds: newElapsed,
        floodedArea: result.floodedArea,
        floodedAreaSqKm: result.floodedAreaSqKm,
        affectedResidents: result.affectedResidents,
        affectedPopulation: result.affectedResidents,
        criticalZoneCount: result.criticalZoneCount,
        warningZoneCount: result.warningZoneCount,
        maxWaterDepth: result.maxWaterDepth,
        maxFlowVelocity: result.maxFlowVelocity,
        totalDrainedVolume: result.totalDrainedVolume,
        bahiniBharaluFlowM3S: result.bahiniBharaluFlowM3S,
        activePumps: result.activePumpsCount,
        activePumpsCount: result.activePumpsCount,
        gmdaPumps: updatedPumps,
        weatherStations: updatedStations,
        history: updatedHistory,
        telemetryHistory: updatedTelemetry,
      });
    },

    stepForward: () => {
      get().runSimulationStep();
    },

    stepBackward: () => {
      const state = get();
      if (state.tick <= 0) return;
      const prevTick = state.tick - 1;
      const snap = state.history[prevTick];
      if (snap) {
        const res2D: GridNode[][] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const row: GridNode[] = [];
          for (let x = 0; x < GRID_WIDTH; x++) {
            row.push(snap.grid[y * GRID_WIDTH + x]);
          }
          res2D.push(row);
        }
        set({
          grid: res2D,
          flatGrid: snap.grid,
          tick: snap.tick,
          currentTick: snap.tick,
          elapsedSeconds: snap.elapsedSeconds,
          floodedAreaSqKm: snap.floodedAreaSqKm,
          affectedResidents: snap.affectedPopulation,
          affectedPopulation: snap.affectedPopulation,
          criticalZoneCount: snap.criticalZoneCount,
          warningZoneCount: snap.warningZoneCount,
          maxWaterDepth: snap.maxWaterDepth,
          maxFlowVelocity: snap.maxFlowVelocity,
          totalDrainedVolume: snap.totalDrainedVolume,
        });
      }
    },

    jumpToTick: (targetTick: number) => {
      const state = get();
      const clampedTick = Math.max(0, Math.min(targetTick, state.maxRecordedTick));
      const snap = state.history[clampedTick];
      if (snap) {
        const res2D: GridNode[][] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const row: GridNode[] = [];
          for (let x = 0; x < GRID_WIDTH; x++) {
            row.push(snap.grid[y * GRID_WIDTH + x]);
          }
          res2D.push(row);
        }
        set({
          grid: res2D,
          flatGrid: snap.grid,
          tick: snap.tick,
          currentTick: snap.tick,
          elapsedSeconds: snap.elapsedSeconds,
          floodedAreaSqKm: snap.floodedAreaSqKm,
          affectedResidents: snap.affectedPopulation,
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

    /**
     * Rainfall Slider Binding:
     * Updates rainfall state and immediately runs one simulation step
     * so user gets instant real-time visual feedback on the canvas.
     */
    setRainfallIntensity: (mmPerHour: number) => {
      set(state => {
        const updatedStations = state.weatherStations.map(st => ({
          ...st,
          rainfallMmHr: parseFloat((mmPerHour * (st.elevationMeters > 60 ? 1.25 : 1.0)).toFixed(1)),
        }));
        return {
          rainfall: mmPerHour,
          config: { ...state.config, rainfallIntensity: mmPerHour },
          weatherStations: updatedStations,
        };
      });
      // Instant visual feedback step
      get().runSimulationStep();
    },

    setDrainageEfficiency: (efficiency: number) => {
      set(state => ({
        config: { ...state.config, drainageSystemEfficiency: efficiency },
      }));
      get().runSimulationStep();
    },

    setCriticalThreshold: (thresholdMeters: number) => {
      set(state => ({
        config: { ...state.config, criticalThreshold: thresholdMeters },
      }));
    },

    setBrahmaputraSluiceGate: (isOpen: boolean) => {
      set(state => ({
        config: { ...state.config, sluiceGateOpen: isOpen },
      }));
      get().runSimulationStep();
    },

    /**
     * Toggle individual GMDA auto-priming pump:
     * Immediately dispatches simulation step for instant real-time drainage feedback.
     */
    toggleGMDAPump: (pumpId: string) => {
      set(state => {
        const nextSet = new Set(state.activePumpIds);
        if (nextSet.has(pumpId)) {
          nextSet.delete(pumpId);
        } else {
          nextSet.add(pumpId);
        }
        const updatedPumps = state.gmdaPumps.map(p =>
          p.id === pumpId
            ? { ...p, status: (nextSet.has(pumpId) ? 'ACTIVE' : 'OFFLINE') as 'ACTIVE' | 'OFFLINE' }
            : p
        );
        return {
          activePumpIds: nextSet,
          activePumps: nextSet.size,
          activePumpsCount: nextSet.size,
          gmdaPumps: updatedPumps,
        };
      });
      get().runSimulationStep();
    },

    /**
     * Master switch for all 20 GMDA auto-priming pumps:
     * Immediately dispatches simulation step.
     */
    setAllGMDAPumpsState: (active: boolean) => {
      set(state => {
        const nextSet = active ? new Set(state.gmdaPumps.map(p => p.id)) : new Set<string>();
        const updatedPumps = state.gmdaPumps.map(p => ({
          ...p,
          status: (active ? 'ACTIVE' : 'OFFLINE') as 'ACTIVE' | 'OFFLINE',
        }));
        return {
          activePumpIds: nextSet,
          activePumps: nextSet.size,
          activePumpsCount: nextSet.size,
          gmdaPumps: updatedPumps,
        };
      });
      get().runSimulationStep();
    },

    /**
     * Disaster Scenario: Simulate 20 GMDA Auto-Priming Pumps Failing
     */
    simulateGMDAPumpsFailure: () => {
      const state = get();
      state.injectDisaster('GMDA_PUMP_GRID_BLACKOUT');
      get().runSimulationStep();
    },

    loadScenario: (presetId: string) => {
      const preset = PRESET_SCENARIOS.find(p => p.id === presetId);
      if (!preset) return;

      const freshGrid2D = generateCityGrid2D();

      if (preset.blockedDrainCoordinates) {
        for (const coord of preset.blockedDrainCoordinates) {
          if (freshGrid2D[coord.y] && freshGrid2D[coord.y][coord.x]) {
            freshGrid2D[coord.y][coord.x].drainBlocked = true;
          }
        }
      }

      const freshFlat = freshGrid2D.flat();

      const pumpsActive = !preset.pumpsOffline;
      const initialActive = pumpsActive
        ? new Set(GMDA_PUMP_STATIONS.map(p => p.id))
        : new Set<string>();

      const updatedPumps = GMDA_PUMP_STATIONS.map(p => ({
        ...p,
        status: (pumpsActive ? 'ACTIVE' : 'FAILED') as 'ACTIVE' | 'FAILED',
      }));

      const freshSnapshot: SimulationSnapshot = {
        tick: 0,
        elapsedSeconds: 0,
        grid: freshFlat,
        floodedAreaSqKm: 0.18,
        affectedPopulation: 0,
        criticalZoneCount: 0,
        warningZoneCount: 0,
        maxWaterDepth: 0.35,
        maxFlowVelocity: 0.22,
        totalDrainedVolume: 0,
        timestamp: Date.now(),
      };

      set({
        isPlaying: false,
        activeScenarioId: preset.id,
        grid: freshGrid2D,
        flatGrid: freshFlat,
        rainfall: preset.rainfallIntensity,
        activePumps: initialActive.size,
        activePumpsCount: initialActive.size,
        activePumpIds: initialActive,
        gmdaPumps: updatedPumps,
        tick: 0,
        currentTick: 0,
        maxRecordedTick: 0,
        elapsedSeconds: 0,
        floodedArea: 3,
        floodedAreaSqKm: 0.18,
        affectedResidents: 0,
        affectedPopulation: 0,
        criticalZoneCount: 0,
        warningZoneCount: 0,
        maxWaterDepth: 0.35,
        history: [freshSnapshot],
        telemetryHistory: [{
          timeLabel: '00:00',
          elapsedMinutes: 0,
          floodedAreaSqKm: 0.18,
          affectedPopulation: 0,
          criticalZones: 0,
          warningZones: 0,
          maxWaterDepth: 0.35,
          avgDrainageEfficiency: Math.round(preset.drainageSystemEfficiency * 100),
          bahiniBharaluFlowM3S: 32.5,
          activePumpsCount: initialActive.size,
        }],
        activeDisasters: [],
        config: {
          ...DEFAULT_CONFIG,
          rainfallIntensity: preset.rainfallIntensity,
          drainageSystemEfficiency: preset.drainageSystemEfficiency,
          coastalSurgeHead: preset.coastalSurgeHead,
          brahmaputraFloodStageMeters: preset.brahmaputraFloodStageMeters || 48.2,
          sluiceGateOpen: preset.sluiceGateOpen !== undefined ? preset.sluiceGateOpen : true,
        },
      });

      // Run one step to hydrate canvas
      get().runSimulationStep();
    },

    resetSimulation: () => {
      const state = get();
      state.loadScenario(state.activeScenarioId);
    },

    injectDisaster: (type: DisasterType) => {
      const state = get();
      const tick = state.tick;

      switch (type) {
        case 'GMDA_PUMP_GRID_BLACKOUT': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'GMDA_PUMP_GRID_BLACKOUT',
            title: 'GMDA 20 Auto-Priming Pump Grid Blackout',
            description: 'Major electrical substation failure knocks out all 20 GMDA auto-priming pumps across Anil Nagar, Nabin Nagar, and Rukminigaon.',
            severity: 'CATASTROPHIC',
            appliedAtTick: tick,
            active: true,
          };
          const failedPumps = state.gmdaPumps.map(p => ({
            ...p,
            status: 'FAILED' as const,
            dischargeM3Hr: 0,
          }));
          set({
            activePumpIds: new Set<string>(),
            activePumps: 0,
            activePumpsCount: 0,
            gmdaPumps: failedPumps,
            config: { ...state.config, drainageSystemEfficiency: 0.15 },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        case 'BRAHMAPUTRA_SLUICE_BACKFLOW': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'BRAHMAPUTRA_SLUICE_BACKFLOW',
            title: 'Brahmaputra Danger Mark & Sluice Lock',
            description: 'Brahmaputra river level reaches 50.8m MSL. Bharalumukh sluice gate locked to prevent river ingress, causing severe Bharalu backwater.',
            severity: 'CATASTROPHIC',
            appliedAtTick: tick,
            active: true,
          };
          set({
            config: {
              ...state.config,
              sluiceGateOpen: false,
              brahmaputraFloodStageMeters: 50.8,
              drainageSystemEfficiency: 0.40,
            },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        case 'DRAINAGE_FAILURE': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'DRAINAGE_FAILURE',
            title: 'Municipal Drainage Sub-station Failure',
            description: 'Urban drainage capacity reduced by 80% due to power cascade.',
            severity: 'SEVERE',
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
          const blockCoords = [
            { x: 9, y: 6 }, // Zoo Road
            { x: 8, y: 5 }, // Anil Nagar
          ];
          const updatedGrid = state.grid.map(row =>
            row.map(node => {
              const isMatch = blockCoords.some(c => c.x === node.x && c.y === node.y);
              return isMatch ? { ...node, drainBlocked: true } : node;
            })
          );
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'CHANNEL_BLOCKAGE',
            title: 'Zoo Road / Anil Nagar Silt & Debris Dam',
            description: 'Heavy silt and solid waste block the Bahini-Bharalu transition culverts.',
            severity: 'SEVERE',
            appliedAtTick: tick,
            affectedCells: ['cell-9-6', 'cell-8-5'],
            active: true,
          };
          set({
            grid: updatedGrid,
            flatGrid: updatedGrid.flat(),
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        case 'CLOUDBURST_SPIKE': {
          const event: DisasterEvent = {
            id: `disaster-${Date.now()}`,
            type: 'CLOUDBURST_SPIKE',
            title: 'Khasi Foothills Cloudburst Spike',
            description: 'Intense orographic storm cloud bursts 160 mm/h over Basistha catchment.',
            severity: 'CATASTROPHIC',
            appliedAtTick: tick,
            active: true,
          };
          set({
            rainfall: 160,
            config: { ...state.config, rainfallIntensity: 160 },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        default:
          break;
      }
      get().runSimulationStep();
    },

    removeDisaster: (disasterId: string) => {
      const state = get();
      const disaster = state.activeDisasters.find(d => d.id === disasterId);
      if (!disaster) return;

      if (disaster.type === 'GMDA_PUMP_GRID_BLACKOUT') {
        const armed = new Set(GMDA_PUMP_STATIONS.map(p => p.id));
        const restored = GMDA_PUMP_STATIONS.map(p => ({ ...p, status: 'ACTIVE' as const }));
        set({
          activePumpIds: armed,
          activePumps: 20,
          activePumpsCount: 20,
          gmdaPumps: restored,
          config: { ...state.config, drainageSystemEfficiency: 1.0 },
        });
      } else if (disaster.type === 'BRAHMAPUTRA_SLUICE_BACKFLOW') {
        set({
          config: {
            ...state.config,
            sluiceGateOpen: true,
            brahmaputraFloodStageMeters: 48.2,
            drainageSystemEfficiency: 1.0,
          },
        });
      } else if (disaster.type === 'CHANNEL_BLOCKAGE') {
        const updatedGrid = state.grid.map(row =>
          row.map(node =>
            (node.x === 9 && node.y === 6) || (node.x === 8 && node.y === 5)
              ? { ...node, drainBlocked: false }
              : node
          )
        );
        set({ grid: updatedGrid, flatGrid: updatedGrid.flat() });
      } else if (disaster.type === 'CLOUDBURST_SPIKE') {
        set({ rainfall: 25, config: { ...state.config, rainfallIntensity: 25 } });
      } else if (disaster.type === 'DRAINAGE_FAILURE') {
        set({ config: { ...state.config, drainageSystemEfficiency: 1.0 } });
      }

      set({
        activeDisasters: state.activeDisasters.filter(d => d.id !== disasterId),
      });
      get().runSimulationStep();
    },

    toggleCellDrainageBlock: (cellId: string) => {
      set(state => {
        const nextGrid = state.grid.map(row =>
          row.map(node => node.id === cellId ? { ...node, drainBlocked: !node.drainBlocked } : node)
        );
        return { grid: nextGrid, flatGrid: nextGrid.flat() };
      });
      get().runSimulationStep();
    },

    toggleCellBarrier: (cellId: string) => {
      set(state => {
        const nextGrid = state.grid.map(row =>
          row.map(node => node.id === cellId ? { ...node, barrierActive: !node.barrierActive } : node)
        );
        return { grid: nextGrid, flatGrid: nextGrid.flat() };
      });
      get().runSimulationStep();
    },

    toggleCellEvacuation: (cellId: string) => {
      set(state => {
        const nextGrid = state.grid.map(row =>
          row.map(node => node.id === cellId ? { ...node, evacuationOrdered: !node.evacuationOrdered } : node)
        );
        return { grid: nextGrid, flatGrid: nextGrid.flat() };
      });
    },

    selectCell: (cellId: string | null) => {
      set({ selectedCellId: cellId });
    },

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
          brahmaputraFloodStageMeters: preset.brahmaputraFloodStageMeters || 48.2,
          sluiceGateOpen: preset.sluiceGateOpen !== undefined ? preset.sluiceGateOpen : true,
        };

        const activePumps = preset.pumpsOffline
          ? new Set<string>()
          : new Set(GMDA_PUMP_STATIONS.map(p => p.id));

        const dataPoints: TelemetryPoint[] = [];
        let peakArea = 0;
        let peakPop = 0;
        let peakDepth = 0;
        let timeToFirstCrit: number | null = null;
        let compromisedInfra = 0;

        for (let t = 0; t <= 20; t++) {
          const stepRes = runSimulationStepPhysics(simGrid, preset.rainfallIntensity, activePumps, simConfig);
          simGrid = stepRes.nextGrid;

          if (stepRes.floodedAreaSqKm > peakArea) peakArea = stepRes.floodedAreaSqKm;
          if (stepRes.affectedResidents > peakPop) peakPop = stepRes.affectedResidents;
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
            affectedPopulation: stepRes.affectedResidents,
            criticalZones: stepRes.criticalZoneCount,
            warningZones: stepRes.warningZoneCount,
            maxWaterDepth: stepRes.maxWaterDepth,
            avgDrainageEfficiency: Math.round(preset.drainageSystemEfficiency * 100),
            bahiniBharaluFlowM3S: stepRes.bahiniBharaluFlowM3S,
            activePumpsCount: stepRes.activePumpsCount,
          });
        }

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
