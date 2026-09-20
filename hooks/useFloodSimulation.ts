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
  RescueCamp,
  RescueCampType,
  RescueCampSupplies,
  CampRecommendationSite,
} from '@/types/simulation';
import {
  generateCityGrid,
  generateCityGrid2D,
  GUWAHATI_AWS_STATIONS,
  GMDA_PUMP_STATIONS,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '@/lib/simulation-engine/cityGrid';
import {
  runSimulationStep as runSimulationStepPhysics,
  PUMP_MAX_EXTRACTION_COEFFICIENT,
} from '@/lib/simulation-engine/physics';
export { PUMP_MAX_EXTRACTION_COEFFICIENT };
import { PRESET_SCENARIOS } from '@/lib/simulation-engine/scenarios';
import {
  DEFAULT_LANDMARK_CAMPS,
  getRecommendedCampSites,
  checkCampFloodHazards,
  getNearestSafeCamp,
} from '@/lib/simulation-engine/rescueCampEngine';

const MAX_HISTORY_BUFFER = 400;

export interface FloodSimulationStore {
  // --- 1. Global Simulation State (Required by Specification) ---
  rainfall: number; // in mm/h, bound to the Catchment Precipitation slider
  activePumps: number; // count of active pumps, bound to 20 GMDA Auto-Priming Pumps
  grid: GridNode[][]; // 2D array of cells: grid[y][x], each containing { elevation, waterDepth, capacity, channelType }
  flatGrid: GridNode[]; // 1D array of cells for convenient linear iteration
  isPlaying: boolean;
  tick: number; // deterministic step counter
  elapsedHours: number; // elapsed simulation time in hours: 0, 6, 12, 18, 24...
  floodedArea: number; // count of cells where waterDepth > 0.1m
  affectedResidents: number; // count of affected citizens

  // --- 2. Deterministic Physics Step Function ---
  runSimulationStep: () => void;
  stepForward6Hours: () => void;
  stepBackward6Hours: () => void;
  resetToZeroHours: () => void;

  // --- 3. Guwahati Real-World Hardware & Telemetry ---
  weatherStations: AutomaticWeatherStation[];
  gmdaPumps: GMDAPumpStation[];
  activePumpIds: Set<string>;
  bahiniBharaluFlowM3S: number;
  activePumpsCount: number;

  // --- 3.5. Guwahati Civil Defense & Rescue Camps ---
  rescueCamps: RescueCamp[];
  recommendedSites: CampRecommendationSite[];
  totalShelteredEvacuees: number;
  totalRescueCapacity: number;

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

  // --- Rescue Camp Actions ---
  deployRescueCamp: (site: {
    gridX: number;
    gridY: number;
    name: string;
    type: RescueCampType;
    capacity: number;
    contactPerson?: string;
    contactPhone?: string;
  }) => void;
  dismantleRescueCamp: (campId: string) => void;
  relocateRescueCamp: (campId: string, newX: number, newY: number) => void;
  autoDeployRecommendedCamps: () => void;
  dispatchSupplies: (
    campId: string,
    supplyType: keyof RescueCampSupplies,
    delta: number
  ) => void;
  evacuateResidentsToCamp: (
    cellId: string,
    campId?: string,
    count?: number
  ) => void;
  evacuateAllCriticalZonesToCamps: () => void;
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
    elapsedHours: 0,
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

    // Rescue Camps State
    rescueCamps: [...DEFAULT_LANDMARK_CAMPS],
    recommendedSites: getRecommendedCampSites(initialFlat, DEFAULT_LANDMARK_CAMPS, 6),
    totalShelteredEvacuees: DEFAULT_LANDMARK_CAMPS.reduce((acc, c) => acc + c.currentOccupancy, 0),
    totalRescueCapacity: DEFAULT_LANDMARK_CAMPS.reduce((acc, c) => acc + c.capacity, 0),

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
     * Deterministic Cellular Automata step execution for 6-hour accumulated interval
     */
    runSimulationStep: () => {
      const state = get();
      const nextTick = state.tick + 1;
      const nextHours = nextTick * 6;
      const newElapsed = nextHours * 3600;

      // Update simulated live AWS weather readings over 6-hour interval
      const updatedStations = state.weatherStations.map(station => {
        const jitter = Math.sin(nextTick * 0.3 + station.elevationMeters) * 4.0;
        const rain = Math.max(0, state.rainfall * (station.elevationMeters > 60 ? 1.25 : 1.0) + jitter);
        const acc = station.accumulatedRainfall24hMm + (rain * 6);
        return {
          ...station,
          rainfallMmHr: parseFloat(rain.toFixed(1)),
          accumulatedRainfall24hMm: parseFloat(acc.toFixed(1)),
          lastPing: 'Just now',
        };
      });

      // Execute deterministic Cellular Automata physics step for the accumulated 6-hour period
      const result = runSimulationStepPhysics(
        state.grid,
        state.rainfall,
        state.activePumpIds,
        state.config
      );

      const timeLabel = `T+${String(nextHours).padStart(2, '0')}h`;

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
        elapsedMinutes: nextHours * 60,
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

      // Check active camps for flood encroachment and update recommendations
      const updatedCamps = checkCampFloodHazards(state.rescueCamps, result.nextGrid);
      const updatedRecommendations = getRecommendedCampSites(result.nextGrid, updatedCamps, 6);
      const sheltered = updatedCamps.reduce((sum, c) => sum + c.currentOccupancy, 0);
      const totalCap = updatedCamps.reduce((sum, c) => sum + c.capacity, 0);

      set({
        grid: result.nextGrid2D,
        flatGrid: result.nextGrid,
        tick: nextTick,
        currentTick: nextTick,
        elapsedHours: nextHours,
        elapsedSeconds: newElapsed,
        maxRecordedTick: Math.max(state.maxRecordedTick, nextTick),
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
        rescueCamps: updatedCamps,
        recommendedSites: updatedRecommendations,
        totalShelteredEvacuees: sheltered,
        totalRescueCapacity: totalCap,
        history: updatedHistory,
        telemetryHistory: updatedTelemetry,
      });
    },

    stepForward: () => {
      get().runSimulationStep();
    },

    stepForward6Hours: () => {
      get().runSimulationStep();
    },

    stepBackward: () => {
      const state = get();
      if (state.tick <= 0) return;
      const prevTick = state.tick - 1;
      const prevHours = prevTick * 6;
      const snap = state.history[prevTick];
      if (snap) {
        const res2D: GridNode[][] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
          const row: GridNode[] = [];
          for (let x = 0; x < GRID_WIDTH; x++) {
            res2D.push(row);
            const idx = y * GRID_WIDTH + x;
            if (snap.grid[idx]) {
              row.push(snap.grid[idx]);
            }
          }
        }
        set({
          grid: res2D,
          flatGrid: snap.grid,
          tick: prevTick,
          currentTick: prevTick,
          elapsedHours: prevHours,
          elapsedSeconds: prevHours * 3600,
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

    stepBackward6Hours: () => {
      get().stepBackward();
    },

    resetToZeroHours: () => {
      get().resetSimulation();
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
          elapsedHours: snap.tick * 6,
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
        elapsedHours: 0,
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

    deployRescueCamp: (site) => {
      const state = get();
      const cell = state.flatGrid.find(n => n.x === site.gridX && n.y === site.gridY);
      const elevation = cell ? cell.elevation : 55.0;

      const newCamp: RescueCamp = {
        id: `camp-${Date.now()}`,
        name: site.name,
        type: site.type,
        gridX: site.gridX,
        gridY: site.gridY,
        elevationMeters: elevation,
        capacity: site.capacity,
        currentOccupancy: 0,
        status: 'OPERATIONAL',
        contactPerson: site.contactPerson || 'Assam Civil Defense Liaison',
        contactPhone: site.contactPhone || '+91 361 223 7000',
        supplies: {
          foodRationsDays: 7,
          potableWaterLiters: Math.round(site.capacity * 6),
          medicalKits: Math.round(site.capacity * 0.1),
          rescueBoats: site.type === 'NDRF_TACTICAL_BASE' ? 8 : 4,
          powerGenerators: 4,
          sanitationUnits: Math.round(site.capacity * 0.008),
          blanketsAndBeds: Math.round(site.capacity * 0.9),
        },
        coveredSectorIds: [
          `cell-${site.gridX}-${site.gridY}`,
          `cell-${Math.max(0, site.gridX - 1)}-${site.gridY}`,
          `cell-${Math.min(17, site.gridX + 1)}-${site.gridY}`,
          `cell-${site.gridX}-${Math.max(0, site.gridY - 1)}`,
          `cell-${site.gridX}-${Math.min(17, site.gridY + 1)}`,
        ],
        establishedTick: state.tick,
        isRecommended: false,
      };

      const nextCamps = [...state.rescueCamps, newCamp];
      const updatedRecs = getRecommendedCampSites(state.flatGrid, nextCamps, 6);
      set({
        rescueCamps: nextCamps,
        recommendedSites: updatedRecs,
        totalRescueCapacity: nextCamps.reduce((sum, c) => sum + c.capacity, 0),
      });
    },

    dismantleRescueCamp: (campId: string) => {
      const state = get();
      const nextCamps = state.rescueCamps.filter(c => c.id !== campId);
      const updatedRecs = getRecommendedCampSites(state.flatGrid, nextCamps, 6);
      set({
        rescueCamps: nextCamps,
        recommendedSites: updatedRecs,
        totalShelteredEvacuees: nextCamps.reduce((sum, c) => sum + c.currentOccupancy, 0),
        totalRescueCapacity: nextCamps.reduce((sum, c) => sum + c.capacity, 0),
      });
    },

    relocateRescueCamp: (campId: string, newX: number, newY: number) => {
      const state = get();
      const cell = state.flatGrid.find(n => n.x === newX && n.y === newY);
      const elevation = cell ? cell.elevation : 60.0;

      const nextCamps = state.rescueCamps.map(c => {
        if (c.id === campId) {
          return {
            ...c,
            gridX: newX,
            gridY: newY,
            elevationMeters: elevation,
            status: 'OPERATIONAL' as const,
            riskAlert: undefined,
            coveredSectorIds: [
              `cell-${newX}-${newY}`,
              `cell-${Math.max(0, newX - 1)}-${newY}`,
              `cell-${Math.min(17, newX + 1)}-${newY}`,
              `cell-${newX}-${Math.max(0, newY - 1)}`,
              `cell-${newX}-${Math.min(17, newY + 1)}`,
            ],
          };
        }
        return c;
      });

      const updatedRecs = getRecommendedCampSites(state.flatGrid, nextCamps, 6);
      set({
        rescueCamps: nextCamps,
        recommendedSites: updatedRecs,
      });
    },

    autoDeployRecommendedCamps: () => {
      const state = get();
      const recs = state.recommendedSites.slice(0, 4);
      if (recs.length === 0) return;

      const newDeployed: RescueCamp[] = recs.map((rec, idx) => ({
        id: `camp-auto-${Date.now()}-${idx}`,
        name: `${rec.name} Relief Base`,
        type: rec.suggestedCampType,
        gridX: rec.gridX,
        gridY: rec.gridY,
        elevationMeters: rec.elevationMeters,
        capacity: rec.suggestedCapacity,
        currentOccupancy: 0,
        status: 'OPERATIONAL' as const,
        contactPerson: 'NDRF Rapid Deployment Unit',
        contactPhone: '+91 361 223 7100',
        supplies: {
          foodRationsDays: 6,
          potableWaterLiters: rec.recommendedSupplies.potableWaterLiters || 25000,
          medicalKits: rec.recommendedSupplies.medicalKits || 400,
          rescueBoats: rec.recommendedSupplies.rescueBoats || 4,
          powerGenerators: 4,
          sanitationUnits: rec.recommendedSupplies.sanitationUnits || 30,
          blanketsAndBeds: rec.recommendedSupplies.blanketsAndBeds || 3000,
        },
        coveredSectorIds: [
          rec.cellId,
          `cell-${Math.max(0, rec.gridX - 1)}-${rec.gridY}`,
          `cell-${Math.min(17, rec.gridX + 1)}-${rec.gridY}`,
          `cell-${rec.gridX}-${Math.max(0, rec.gridY - 1)}`,
          `cell-${rec.gridX}-${Math.min(17, rec.gridY + 1)}`,
        ],
        establishedTick: state.tick,
        isRecommended: true,
      }));

      const nextCamps = [...state.rescueCamps, ...newDeployed];
      const updatedRecs = getRecommendedCampSites(state.flatGrid, nextCamps, 6);
      set({
        rescueCamps: nextCamps,
        recommendedSites: updatedRecs,
        totalRescueCapacity: nextCamps.reduce((sum, c) => sum + c.capacity, 0),
      });
    },

    dispatchSupplies: (campId: string, supplyType: keyof RescueCampSupplies, delta: number) => {
      set(state => {
        const nextCamps = state.rescueCamps.map(camp => {
          if (camp.id === campId) {
            const cur = camp.supplies[supplyType];
            return {
              ...camp,
              supplies: {
                ...camp.supplies,
                [supplyType]: Math.max(0, cur + delta),
              },
            };
          }
          return camp;
        });
        return { rescueCamps: nextCamps };
      });
    },

    evacuateResidentsToCamp: (cellId: string, campId?: string, count?: number) => {
      const state = get();
      const targetCell = state.flatGrid.find(n => n.id === cellId);
      if (!targetCell) return;

      const numToEvac = count !== undefined ? Math.min(count, targetCell.population) : Math.min(800, targetCell.population);
      if (numToEvac <= 0) return;

      const eligible = state.rescueCamps.filter(
        c => (c.status === 'OPERATIONAL' || c.status === 'NEAR_CAPACITY') && c.currentOccupancy < c.capacity
      );
      const camp = campId
        ? eligible.find(c => c.id === campId) || eligible[0]
        : eligible[0];

      if (!camp) return;

      const capacityRemaining = camp.capacity - camp.currentOccupancy;
      const actualEvac = Math.min(numToEvac, capacityRemaining);
      if (actualEvac <= 0) return;

      const nextCamps = state.rescueCamps.map(c => {
        if (c.id === camp.id) {
          const occ = c.currentOccupancy + actualEvac;
          return {
            ...c,
            currentOccupancy: occ,
            status: occ >= c.capacity ? ('AT_CAPACITY' as const) : occ >= c.capacity * 0.85 ? ('NEAR_CAPACITY' as const) : c.status,
          };
        }
        return c;
      });

      const nextGrid = state.grid.map(row =>
        row.map(n => {
          if (n.id === cellId) {
            return {
              ...n,
              population: Math.max(0, n.population - actualEvac),
              evacuationOrdered: true,
            };
          }
          return n;
        })
      );

      set({
        grid: nextGrid,
        flatGrid: nextGrid.flat(),
        rescueCamps: nextCamps,
        totalShelteredEvacuees: nextCamps.reduce((sum, c) => sum + c.currentOccupancy, 0),
      });
    },

    evacuateAllCriticalZonesToCamps: () => {
      const state = get();
      const critCells = state.flatGrid.filter(
        n => (n.status === 'CRITICAL' || n.status === 'WARNING') && n.population > 0
      );

      if (critCells.length === 0) return;

      const camps = [...state.rescueCamps];
      const cellMap = new Map<string, number>();

      for (const cell of critCells) {
        let remainingToEvac = Math.min(cell.population, 1200);

        for (let i = 0; i < camps.length; i++) {
          const c = camps[i];
          if ((c.status === 'OPERATIONAL' || c.status === 'NEAR_CAPACITY') && c.currentOccupancy < c.capacity) {
            const avail = c.capacity - c.currentOccupancy;
            const take = Math.min(remainingToEvac, avail);
            if (take > 0) {
              const newOcc = c.currentOccupancy + take;
              camps[i] = {
                ...c,
                currentOccupancy: newOcc,
                status: newOcc >= c.capacity ? 'AT_CAPACITY' : newOcc >= c.capacity * 0.85 ? 'NEAR_CAPACITY' : c.status,
              };
              remainingToEvac -= take;
              cellMap.set(cell.id, (cellMap.get(cell.id) || 0) + take);
            }
          }
          if (remainingToEvac <= 0) break;
        }
      }

      const nextGrid = state.grid.map(row =>
        row.map(n => {
          const evacuated = cellMap.get(n.id);
          if (evacuated) {
            return {
              ...n,
              population: Math.max(0, n.population - evacuated),
              evacuationOrdered: true,
            };
          }
          return n;
        })
      );

      set({
        grid: nextGrid,
        flatGrid: nextGrid.flat(),
        rescueCamps: camps,
        totalShelteredEvacuees: camps.reduce((sum, c) => sum + c.currentOccupancy, 0),
      });
    },
  };
});
