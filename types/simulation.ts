/**
 * HYDRO MATRIX: Flood Simulation & Early Warning Dashboard
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Supports the Guwahati Metropolitan Development Authority (GMDA)
 * GIS-based comprehensive drainage master plan and DPR objectives.
 */

export type AlertLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

export type InfrastructureType = 
  | 'hospital' 
  | 'substation' 
  | 'shelter' 
  | 'pumping_station' 
  | 'evacuation_route'
  | 'government'
  | 'wetland'
  | null;

/**
 * Government-recognized primary drainage channels in Guwahati
 */
export type RecognizedDrainageChannel = 
  | 'Bharalu' 
  | 'Mora Bharalu' 
  | 'Basistha' 
  | 'Bahini' 
  | 'Lakhimijan'
  | 'Brahmaputra';

export interface DrainageChannelMeta {
  id: RecognizedDrainageChannel;
  name: string;
  assameseName: string;
  lengthKm: number;
  origin: string;
  outfall: string;
  status: 'OPTIMAL' | 'SILTED' | 'BACKFLOW_RISK' | 'CHOKED';
  waterDischargeM3S: number;
  maxDesignCapacityM3S: number;
  color: string;
}

/**
 * Automatic Weather Station (AWS) deployed across Guwahati
 */
export interface AutomaticWeatherStation {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  stationCode: string;
  elevationMeters: number;
  rainfallMmHr: number;
  accumulatedRainfall24hMm: number;
  humidityPercent: number;
  temperatureCelsius: number;
  barometricPressureHpa: number;
  windSpeedKmh: number;
  batteryLevelPercent: number;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE';
  lastPing: string;
}

/**
 * GMDA Auto-Priming Dewatering Pump Station
 */
export interface GMDAPumpStation {
  id: string;
  name: string;
  locationDescription: string;
  gridX: number;
  gridY: number;
  capacityM3Hr: number;
  dischargeM3Hr: number;
  rpm: number;
  powerSource: 'DIESEL_GENSET' | 'GRID_ELECTRIC' | 'DUAL_HYBRID';
  autoPrimingArmed: boolean;
  status: 'ACTIVE' | 'STANDBY' | 'FAILED' | 'OFFLINE';
  waterLevelTriggerMeters: number;
  channelDischarge: RecognizedDrainageChannel;
}

/**
 * GridNode represents an individual geospatial sector/cell in the Guwahati grid.
 */
export interface GridNode {
  id: string;
  x: number;
  y: number;
  name: string;
  locality: string;
  elevation: number;
  waterDepth: number; // Water accumulation depth in meters
  currentWaterLevel: number; // In meters (synced with waterDepth)
  capacity: number; // Drainage capacity in m³/s or mm/h
  drainageCapacity: number; // Synced with capacity
  channelType: string; // Drainage channel identifier ('Bharalu' | 'Bahini' | 'Basistha' | 'Mora Bharalu' | 'Lakhimijan' | 'Brahmaputra' | 'none')
  totalElevation: number;
  effectiveDrainage: number;
  permeability: number;
  population: number;
  inflowRate: number;
  outflowRate: number;
  waterLevelDelta: number;
  flowVector: {
    vx: number;
    vy: number;
    speed: number;
  };
  status: AlertLevel;
  timeToCriticalMinutes: number | null;
  drainBlocked: boolean;
  barrierActive: boolean;
  barrierHeight: number;
  infrastructure: InfrastructureType;
  infrastructureName?: string;
  evacuationOrdered: boolean;
  channel: RecognizedDrainageChannel | null;
  awsStationId?: string;
  gmdaPumpId?: string;
  rescueCampId?: string;
  isRecommendedCampSite?: boolean;
}

export type RescueCampType =
  | 'APEX_MEDICAL'
  | 'MASS_SHELTER'
  | 'SUPPLY_DISTRIBUTION'
  | 'NDRF_TACTICAL_BASE';

export type RescueCampStatus =
  | 'OPERATIONAL'
  | 'NEAR_CAPACITY'
  | 'AT_CAPACITY'
  | 'AT_RISK_FLOODING'
  | 'COMPROMISED';

export interface RescueCampSupplies {
  foodRationsDays: number;
  potableWaterLiters: number;
  medicalKits: number;
  rescueBoats: number;
  powerGenerators: number;
  sanitationUnits: number;
  blanketsAndBeds: number;
}

export interface RescueCamp {
  id: string;
  name: string;
  assameseName?: string;
  type: RescueCampType;
  gridX: number;
  gridY: number;
  elevationMeters: number;
  capacity: number;
  currentOccupancy: number;
  status: RescueCampStatus;
  contactPerson: string;
  contactPhone: string;
  supplies: RescueCampSupplies;
  coveredSectorIds: string[];
  establishedTick: number;
  isRecommended: boolean;
  riskAlert?: string;
}

export interface CampRecommendationSite {
  gridX: number;
  gridY: number;
  cellId: string;
  name: string;
  elevationMeters: number;
  currentWaterLevel: number;
  suitabilityScore: number; // 0 to 100
  suitabilityReason: string;
  nearbyPopulationAtRisk: number;
  nearestRoadAccess: string;
  suggestedCampType: RescueCampType;
  suggestedCapacity: number;
  recommendedSupplies: Partial<RescueCampSupplies>;
}

export type SimulationCell = GridNode;

export interface SimulationConfig {
  rainfallIntensity: number;
  timeStepSeconds: number;
  speedMultiplier: number;
  criticalThreshold: number;
  warningThreshold: number;
  drainageSystemEfficiency: number;
  surfaceRoughness: number;
  soilAbsorptionRate: number;
  coastalSurgeHead: number; // Brahmaputra River flood stage
  brahmaputraFloodStageMeters: number; // Brahmaputra water stage at Bharalumukh
  sluiceGateOpen: boolean; // Bharalumukh sluice gate open/closed
}

export interface SimulationSnapshot {
  tick: number;
  elapsedSeconds: number;
  grid: GridNode[];
  floodedAreaSqKm: number;
  affectedPopulation: number;
  criticalZoneCount: number;
  warningZoneCount: number;
  maxWaterDepth: number;
  maxFlowVelocity: number;
  totalDrainedVolume: number;
  timestamp: number;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  iconName: string;
  rainfallIntensity: number;
  drainageSystemEfficiency: number;
  coastalSurgeHead: number;
  brahmaputraFloodStageMeters?: number;
  sluiceGateOpen?: boolean;
  pumpsOffline?: boolean;
  blockedDrainCoordinates: Array<{ x: number; y: number }>;
  activeBarriers?: Array<{ x: number; y: number }>;
  estimatedDurationHours: number;
}

export type DisasterType = 
  | 'DRAINAGE_FAILURE' 
  | 'CHANNEL_BLOCKAGE' 
  | 'CLOUDBURST_SPIKE' 
  | 'STORM_SURGE_BREACH'
  | 'GMDA_PUMP_GRID_BLACKOUT'
  | 'BRAHMAPUTRA_SLUICE_BACKFLOW';

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

export interface TelemetryPoint {
  timeLabel: string;
  elapsedMinutes: number;
  floodedAreaSqKm: number;
  affectedPopulation: number;
  criticalZones: number;
  warningZones: number;
  maxWaterDepth: number;
  avgDrainageEfficiency: number;
  bahiniBharaluFlowM3S?: number;
  activePumpsCount?: number;
}

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

export interface MapViewSettings {
  projection: '2.5D' | '2D';
  pitch: number;
  bearing: number;
  zoom: number;
  showElevationContours: boolean;
  showWaterDepthHeatmap: boolean;
  showFlowVectors: boolean;
  showDrainagePumps: boolean;
  showPopulationDensity: boolean;
  showCriticalAlertPulses: boolean;
  showInfrastructureMarkers: boolean;
  showPrimaryChannels: boolean;
  showWeatherStations: boolean;
  showRescueCamps: boolean;
  selectedCellId: string | null;
}
