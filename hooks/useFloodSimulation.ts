/**
 * HYDRO MATRIX: useFloodSimulation (Zustand State Store & Physics Loop Hook)
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - Live data feeds from 18 Automatic Weather Stations (AWS) around Guwahati
 * - Interactive toggles for 20 GMDA Auto-Priming Dewatering Pumps
 * - Disaster scenarios: GMDA pump grid blackout, Brahmaputra sluice gate backflow
 * - Channel tracking for Bharalu, Mora Bharalu, Basistha, Bahini, Lakhimijan
 * - Bidirectional time travel scrubber & comparative benchmarking
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
  GUWAHATI_AWS_STATIONS,
  GMDA_PUMP_STATIONS,
} from '@/lib/simulation-engine/cityGrid';
import { stepSimulationPhysics } from '@/lib/simulation-engine/physics';
import { PRESET_SCENARIOS } from '@/lib/simulation-engine/scenarios';

const MAX_HISTORY_BUFFER = 400;

export interface FloodSimulationStore {
  // --- Simulation State ---
  grid: GridNode[];
  currentTick: number;
  maxRecordedTick: number;
  elapsedSeconds: number;
  isPlaying: boolean;
  playbackSpeed: number;
  activeScenarioId: string;
  config: SimulationConfig;

  // --- Guwahati Real-World Hardware & Telemetry ---
  weatherStations: AutomaticWeatherStation[];
  gmdaPumps: GMDAPumpStation[];
  activePumpIds: Set<string>;
  bahiniBharaluFlowM3S: number;
  activePumpsCount: number;

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
  surfaceRoughness: 0.042, // Manning's n for urban channels with siltation
  soilAbsorptionRate: 15,
  coastalSurgeHead: 0.0,
  brahmaputraFloodStageMeters: 48.2, // Normal river stage
  sluiceGateOpen: true, // Bharalumukh sluice open
};

export const useFloodSimulation = create<FloodSimulationStore>((set, get) => {
  const initialGrid = generateCityGrid();
  const initialPumps = [...GMDA_PUMP_STATIONS];
  const initialActivePumps = new Set<string>(initialPumps.map(p => p.id));
  const initialStations = [...GUWAHATI_AWS_STATIONS];

  const initialSnapshot: SimulationSnapshot = {
    tick: 0,
    elapsedSeconds: 0,
    grid: initialGrid,
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
    grid: initialGrid,
    currentTick: 0,
    maxRecordedTick: 0,
    elapsedSeconds: 0,
    isPlaying: false,
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

    stepForward: () => {
      const state = get();
      const nextTick = state.currentTick + 1;

      // Update simulated live AWS weather readings
      const updatedStations = state.weatherStations.map(station => {
        const jitter = (Math.sin(nextTick * 0.3 + station.elevationMeters) * 4.0);
        const rain = Math.max(0, state.config.rainfallIntensity * (station.elevationMeters > 60 ? 1.25 : 1.0) + jitter);
        const acc = station.accumulatedRainfall24hMm + (rain / 60);
        return {
          ...station,
          rainfallMmHr: parseFloat(rain.toFixed(1)),
          accumulatedRainfall24hMm: parseFloat(acc.toFixed(1)),
          lastPing: 'Just now',
        };
      });

      // Scrubbing inside history
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
          weatherStations: updatedStations,
        });
        return;
      }

      // Execute discrete physics step
      const physicsResult = stepSimulationPhysics(state.grid, state.config, state.activePumpIds);
      const newElapsed = state.elapsedSeconds + state.config.timeStepSeconds;
      const elapsedMins = Math.floor(newElapsed / 60);
      const hours = Math.floor(elapsedMins / 60);
      const mins = elapsedMins % 60;
      const timeLabel = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      // Update pump operational metrics
      const updatedPumps: GMDAPumpStation[] = state.gmdaPumps.map(pump => {
        const isArmed = state.activePumpIds.has(pump.id);
        const cell = physicsResult.nextGrid.find(n => n.x === pump.gridX && n.y === pump.gridY);
        const hasWater = cell ? cell.currentWaterLevel >= pump.waterLevelTriggerMeters : false;
        const pumpStatus: 'ACTIVE' | 'STANDBY' | 'FAILED' | 'OFFLINE' = !isArmed ? 'OFFLINE' : hasWater ? 'ACTIVE' : 'STANDBY';
        return {
          ...pump,
          status: pumpStatus,
          dischargeM3Hr: isArmed && hasWater ? Math.round(pump.capacityM3Hr * (0.9 + Math.random() * 0.1)) : 0,
        };
      });

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
        bahiniBharaluFlowM3S: physicsResult.bahiniBharaluFlowM3S,
        activePumpsCount: physicsResult.activePumpsCount,
      };

      const updatedHistory = [...state.history, newSnapshot];
      if (updatedHistory.length > MAX_HISTORY_BUFFER) updatedHistory.shift();

      const updatedTelemetry = [...state.telemetryHistory, newTelemetryPoint];
      if (updatedTelemetry.length > 60) updatedTelemetry.shift();

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
        bahiniBharaluFlowM3S: physicsResult.bahiniBharaluFlowM3S,
        activePumpsCount: physicsResult.activePumpsCount,
        gmdaPumps: updatedPumps,
        weatherStations: updatedStations,
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
      set(state => {
        const updatedStations = state.weatherStations.map(st => ({
          ...st,
          rainfallMmHr: parseFloat((mmPerHour * (st.elevationMeters > 60 ? 1.25 : 1.0)).toFixed(1)),
        }));
        return {
          config: { ...state.config, rainfallIntensity: mmPerHour },
          weatherStations: updatedStations,
        };
      });
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

    setBrahmaputraSluiceGate: (isOpen: boolean) => {
      set(state => ({
        config: { ...state.config, sluiceGateOpen: isOpen },
      }));
    },

    /**
     * Toggle individual GMDA auto-priming pump
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
          gmdaPumps: updatedPumps,
          activePumpsCount: nextSet.size,
        };
      });
    },

    /**
     * Master switch for all 20 GMDA auto-priming pumps
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
          gmdaPumps: updatedPumps,
          activePumpsCount: nextSet.size,
        };
      });
    },

    /**
     * Disaster Scenario: Simulate 20 GMDA Auto-Priming Pumps Failing
     */
    simulateGMDAPumpsFailure: () => {
      const state = get();
      state.injectDisaster('GMDA_PUMP_GRID_BLACKOUT');
    },

    loadScenario: (presetId: string) => {
      const preset = PRESET_SCENARIOS.find(p => p.id === presetId);
      if (!preset) return;

      const freshGrid = generateCityGrid();

      if (preset.blockedDrainCoordinates) {
        for (const coord of preset.blockedDrainCoordinates) {
          const target = freshGrid.find(n => n.x === coord.x && n.y === coord.y);
          if (target) target.drainBlocked = true;
        }
      }

      // If preset has pumps offline
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
        grid: freshGrid,
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
        grid: freshGrid,
        gmdaPumps: updatedPumps,
        activePumpIds: initialActive,
        activePumpsCount: initialActive.size,
        currentTick: 0,
        maxRecordedTick: 0,
        elapsedSeconds: 0,
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
        floodedAreaSqKm: 0.18,
        affectedPopulation: 0,
        criticalZoneCount: 0,
        warningZoneCount: 0,
        maxWaterDepth: 0.35,
      });
    },

    resetSimulation: () => {
      const state = get();
      state.loadScenario(state.activeScenarioId);
    },

    injectDisaster: (type: DisasterType) => {
      const state = get();
      const tick = state.currentTick;

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
            gmdaPumps: failedPumps,
            activePumpsCount: 0,
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
          // Block Anil Nagar and Zoo Road culverts
          const blockCoords = [
            { x: 9, y: 6 }, // Zoo Road
            { x: 8, y: 5 }, // Anil Nagar
          ];
          const updatedGrid = state.grid.map(node => {
            const isMatch = blockCoords.some(c => c.x === node.x && c.y === node.y);
            return isMatch ? { ...node, drainBlocked: true } : node;
          });
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
            config: { ...state.config, rainfallIntensity: 160 },
            activeDisasters: [event, ...state.activeDisasters],
          });
          break;
        }

        default:
          break;
      }
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
          gmdaPumps: restored,
          activePumpsCount: 20,
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
        const updatedGrid = state.grid.map(node =>
          (node.x === 9 && node.y === 6) || (node.x === 8 && node.y === 5)
            ? { ...node, drainBlocked: false }
            : node
        );
        set({ grid: updatedGrid });
      } else if (disaster.type === 'CLOUDBURST_SPIKE') {
        set({ config: { ...state.config, rainfallIntensity: 25 } });
      } else if (disaster.type === 'DRAINAGE_FAILURE') {
        set({ config: { ...state.config, drainageSystemEfficiency: 1.0 } });
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
          const stepRes = stepSimulationPhysics(simGrid, simConfig, activePumps);
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
