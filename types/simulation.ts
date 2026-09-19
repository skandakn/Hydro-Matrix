/**
 * FLOWSHIELD: Flood Simulation & Early Warning Dashboard
 * Core TypeScript Interfaces & Simulation Types
 * 
 * Mathematical modeling incorporates 2D Shallow Water Approximations,
 * diffusive elevation gradients, Manning's roughness, infiltration, and
 * dynamic early-warning classification logic.
 */

export type AlertLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

export type InfrastructureType = 
  | 'hospital' 
  | 'substation' 
  | 'shelter' 
  | 'pumping_station' 
  | 'evacuation_route'
  | null;

/**
 * GridNode represents an individual geospatial sector/cell in the city grid.
 * Tracks terrain altitude, current fluid volume, dynamic hydraulic head,
 * drainage performance, and vulnerability metrics.
 */
export interface GridNode {
  /** Unique identifier format: "cell-x-y" */
  id: string;
  /** Grid X coordinate (0-indexed, West to East) */
  x: number;
  /** Grid Y coordinate (0-indexed, North to South) */
  y: number;
  /** Real-world district or sector identifier */
  name: string;
  /** Base terrain elevation in meters above datum (z_base) */
  elevation: number;
  /** Current floodwater surface depth in meters (h) */
  currentWaterLevel: number;
  /** Total hydraulic surface elevation: H = elevation + currentWaterLevel */
  totalElevation: number;
  /** Maximum engineered drainage discharge capacity (m³/s or equivalent m/tick) */
  drainageCapacity: number;
  /** Actual operational drainage capacity after failure or blockages */
  effectiveDrainage: number;
  /** Soil/surface permeability coefficient (0.0 = impervious concrete, 1.0 = permeable wetlands) */
  permeability: number;
  /** Resident and commuter population within this sector */
  population: number;
  /** Net instantaneous water inflow from neighboring cells (m³/s) */
  inflowRate: number;
  /** Net instantaneous water outflow to neighboring cells (m³/s) */
  outflowRate: number;
  /** Rate of water depth change: dh/dt (m/min) */
  waterLevelDelta: number;
  /** 2D flow velocity vector based on hydraulic gradient (vx, vy) in m/s */
  flowVector: {
    vx: number;
    vy: number;
    speed: number;
  };
  /** Dynamic alert classification based on critical water thresholds */
  status: AlertLevel;
  /**
   * Estimated Time to Critical Conditions (tau_crit in minutes).
   * Calculated via: tau = (h_crit - h) / (dh/dt)
   * null if water level is stable, receding, or already critical.
   */
  timeToCriticalMinutes: number | null;
  /** Whether the storm drainage conduit in this cell is mechanically blocked */
  drainBlocked: boolean;
  /** Whether a temporary emergency flood barrier (e.g., sandbag/tiger dam) is deployed */
  barrierActive: boolean;
  /** Height in meters added to cell perimeter when barrier is active */
  barrierHeight: number;
  /** High-value infrastructure present in this cell */
  infrastructure: InfrastructureType;
  /** Name of the specific infrastructure facility (e.g., "City General Hospital") */
  infrastructureName?: string;
  /** Whether civil defense evacuation order has been issued for this cell */
  evacuationOrdered: boolean;
}

/**
 * Global Configuration for the Flood Simulation Engine
 */
export interface SimulationConfig {
  /** Atmospheric precipitation rate (mm/hour) */
  rainfallIntensity: number;
  /** Simulation time step in seconds per tick (default: 60s per tick) */
  timeStepSeconds: number;
  /** Speed multiplier for clock updates (e.g., 1x, 2x, 5x, 10x) */
  speedMultiplier: number;
  /** Critical water depth threshold in meters (default: 0.75m) */
  criticalThreshold: number;
  /** Warning water depth threshold in meters (default: 0.25m) */
  warningThreshold: number;
  /** Global drainage failure modifier: 0.0 (total failure) to 1.0 (100% operational) */
  drainageSystemEfficiency: number;
  /** Global Manning's roughness coefficient (n) determining surface flow resistance */
  surfaceRoughness: number;
  /** Evaporation and deep aquifer infiltration loss coefficient */
  soilAbsorptionRate: number;
  /** Whether coastal storm surge / boundary tidal head is active */
  coastalSurgeHead: number;
}

/**
 * Snapshot of the entire simulation state at a specific tick.
 * Enables scrub-back, replay, forward inspection, and historical telemetry analysis.
 */
export interface SimulationSnapshot {
  /** Discrete simulation tick sequence number */
  tick: number;
  /** Total simulated time elapsed in seconds from t_0 */
  elapsedSeconds: number;
  /** Current state of all grid nodes at this snapshot */
  grid: GridNode[];
  /** Total inundated land area in square kilometers */
  floodedAreaSqKm: number;
  /** Total population located in Warning or Critical sectors */
  affectedPopulation: number;
  /** Count of sectors currently at Critical status */
  criticalZoneCount: number;
  /** Count of sectors currently at Warning status */
  warningZoneCount: number;
  /** Maximum water depth recorded across any cell in meters */
  maxWaterDepth: number;
  /** Peak flow velocity across any boundary in m/s */
  maxFlowVelocity: number;
  /** Average drainage system output in m³/s */
  totalDrainedVolume: number;
  /** Timestamp when snapshot was captured */
  timestamp: number;
}

/**
 * Predefined Crisis Scenario Profiles
 */
export interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  iconName: string;
  rainfallIntensity: number;
  drainageSystemEfficiency: number;
  coastalSurgeHead: number;
  blockedDrainCoordinates: Array<{ x: number; y: number }>;
  activeBarriers?: Array<{ x: number; y: number }>;
  estimatedDurationHours: number;
}

/**
 * Disaster Injection Action Payloads
 */
export type DisasterType = 
  | 'DRAINAGE_FAILURE' 
  | 'CHANNEL_BLOCKAGE' 
  | 'CLOUDBURST_SPIKE' 
  | 'STORM_SURGE_BREACH';

export interface DisasterEvent {
  id: string;
  type: DisasterType;
  title: string;
  description: string;
  severity: 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  appliedAtTick: number;
  affectedCells?: string[];
  active: boolean;
}

/**
 * Telemetry Timeseries point for Recharts graphs
 */
export interface TelemetryPoint {
  timeLabel: string;
  elapsedMinutes: number;
  floodedAreaSqKm: number;
  affectedPopulation: number;
  criticalZones: number;
  warningZones: number;
  maxWaterDepth: number;
  avgDrainageEfficiency: number;
}

/**
 * Scenario Comparison Metrics Record
 */
export interface ScenarioComparisonRecord {
  scenarioId: string;
  scenarioName: string;
  peakFloodedAreaSqKm: number;
  peakAffectedPopulation: number;
  peakWaterDepth: number;
  timeToFirstCriticalMin: number | null;
  infrastructureCompromisedCount: number;
  dataPoints: TelemetryPoint[];
}

/**
 * Map Viewport Camera and Layer Settings
 */
export interface MapViewSettings {
  /** View angle: '2.5D' (isometric tilted) or '2D' (orthographic GIS top-down) */
  projection: '2.5D' | '2D';
  /** Camera pitch/tilt angle in degrees (e.g. 50 deg for 2.5D) */
  pitch: number;
  /** Camera rotation/bearing in degrees (0 - 360) */
  bearing: number;
  /** Zoom level factor */
  zoom: number;
  /** Active layer overlays */
  showElevationContours: boolean;
  showWaterDepthHeatmap: boolean;
  showFlowVectors: boolean;
  showDrainagePumps: boolean;
  showPopulationDensity: boolean;
  showCriticalAlertPulses: boolean;
  showInfrastructureMarkers: boolean;
  /** Selected cell for HUD drill-down */
  selectedCellId: string | null;
}
