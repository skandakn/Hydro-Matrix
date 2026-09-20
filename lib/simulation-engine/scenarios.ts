/**
 * HYDRO MATRIX: Guwahati & Bahini/Bharalu Basin Crisis Scenarios
 * 
 * Hyper-focused real-world emergency scenarios supporting GMDA drainage planning:
 * 1. Normal Seasonal Monsoon over Guwahati
 * 2. Meghalaya Foothill Cloudburst & Jorabat Runoff Surge
 * 3. GMDA 20 Auto-Priming Pump Grid Failure (High-Stakes Disaster)
 * 4. Brahmaputra High Stage & Bharalumukh Sluice Lock
 * 5. Anil Nagar / Zoo Road Culvert Silt & Plastic Debris Choke
 */

import { ScenarioPreset } from '@/types/simulation';

export interface BenchmarkScenarioMeta {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  rainfallIntensity: number;
  drainageEfficiency: number;
  drainageLabel: string;
  activePumpsCount: number;
  activePumpsRatio: number;
  sluiceGateOpen: boolean;
  coastalSurgeHead: number;
  color: string;
}

export const BENCHMARK_SCENARIOS: BenchmarkScenarioMeta[] = [
  {
    id: 'guwahati-monsoon',
    name: 'Normal Monsoon Baseline',
    shortName: 'Monsoon Baseline',
    badge: '100% DRAINAGE',
    description: 'Steady 22 mm/h rain over the Bahini-Bharalu basin. 100% drainage capacity (all 20 GMDA auto-priming pumps armed, Bharalumukh sluice open).',
    rainfallIntensity: 22,
    drainageEfficiency: 1.0,
    drainageLabel: '100% (20/20 Pumps + Sluice Open)',
    activePumpsCount: 20,
    activePumpsRatio: 1.0,
    sluiceGateOpen: true,
    coastalSurgeHead: 0.0,
    color: '#10b981', // Emerald
  },
  {
    id: 'meghalaya-cloudburst',
    name: 'Heavy Convective Cloudburst',
    shortName: 'Convective Cloudburst',
    badge: '85 mm/h DOWNPOUR',
    description: 'Sudden 85 mm/h convective cloudburst over southern foothill catchments with standard drainage capacity.',
    rainfallIntensity: 85,
    drainageEfficiency: 1.0,
    drainageLabel: 'Standard (100% Pumps Active)',
    activePumpsCount: 20,
    activePumpsRatio: 1.0,
    sluiceGateOpen: true,
    coastalSurgeHead: 0.2,
    color: '#06b6d4', // Cyan
  },
  {
    id: 'gmda-pumps-failure',
    name: 'Critical Pump Grid Failure',
    shortName: 'Pump Grid Failure',
    badge: '80% FLEET OFFLINE',
    description: '65 mm/h rainfall with 80% pump fleet offline (4/20 operational) due to electrical power grid blackout.',
    rainfallIntensity: 65,
    drainageEfficiency: 0.20,
    drainageLabel: '20% Capacity (16 Pumps Offline)',
    activePumpsCount: 4,
    activePumpsRatio: 0.20,
    sluiceGateOpen: true,
    coastalSurgeHead: 0.2,
    color: '#f59e0b', // Amber
  },
  {
    id: 'brahmaputra-backflow',
    name: 'Sluice Gate Closed / High River Stage',
    shortName: 'Sluice Gate Closed',
    badge: '0% GRAVITY OUTFLOW',
    description: '45 mm/h rain with Brahmaputra above danger mark (50.8m MSL). Bharalumukh sluice gate locked (0% natural gravity river outflow).',
    rainfallIntensity: 45,
    drainageEfficiency: 0.35,
    drainageLabel: '0% Gravity Outflow (Gate Locked)',
    activePumpsCount: 20,
    activePumpsRatio: 1.0,
    sluiceGateOpen: false,
    coastalSurgeHead: 1.8,
    color: '#f43f5e', // Crimson
  },
];

export const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'guwahati-monsoon',
    name: 'Normal Monsoon Baseline',
    badge: '100% DRAINAGE',
    description: 'Steady 22 mm/h rain over the Bahini-Bharalu basin. All 20 GMDA auto-priming pumps operational at normal capacity (100% efficiency). Bharalumukh flood gate open for natural gravity drainage.',
    iconName: 'CloudRain',
    rainfallIntensity: 22,
    drainageSystemEfficiency: 1.0,
    coastalSurgeHead: 0.0,
    brahmaputraFloodStageMeters: 48.2,
    sluiceGateOpen: true,
    pumpsOffline: false,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 24,
  },
  {
    id: 'meghalaya-cloudburst',
    name: 'Heavy Convective Cloudburst',
    badge: '85 mm/h CONVECTIVE',
    description: '85 mm/h sudden convective cloudburst over the hills. Runoff funnels through Basistha and Jorabat into Dispur Capital Complex and Rukminigaon with standard drainage.',
    iconName: 'CloudLightning',
    rainfallIntensity: 85,
    drainageSystemEfficiency: 1.0,
    coastalSurgeHead: 0.2,
    brahmaputraFloodStageMeters: 49.0,
    sluiceGateOpen: true,
    pumpsOffline: false,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 24,
  },
  {
    id: 'gmda-pumps-failure',
    name: 'Critical Pump Grid Failure',
    badge: '80% PUMP OFFLINE',
    description: 'Major electrical power failure takes 80% of the GMDA pump fleet offline (only 4/20 pumps running) during 65 mm/h rain. Severe waterlogging in Anil Nagar and Nabin Nagar.',
    iconName: 'AlertOctagon',
    rainfallIntensity: 65,
    drainageSystemEfficiency: 0.20,
    coastalSurgeHead: 0.2,
    brahmaputraFloodStageMeters: 49.2,
    sluiceGateOpen: true,
    pumpsOffline: true,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 24,
  },
  {
    id: 'brahmaputra-backflow',
    name: 'Sluice Gate Closed / High River Stage',
    badge: '0% GRAVITY OUTFLOW',
    description: 'Brahmaputra breaches Danger Mark (50.8m MSL). Sluice locked to prevent catastrophic river backflow (0% natural gravity outflow) with 45 mm/h continuous internal precipitation.',
    iconName: 'Waves',
    rainfallIntensity: 45,
    drainageSystemEfficiency: 0.35,
    coastalSurgeHead: 1.8,
    brahmaputraFloodStageMeters: 50.8,
    sluiceGateOpen: false,
    pumpsOffline: false,
    blockedDrainCoordinates: [
      { x: 5, y: 2 }, // Bharalumukh outfall closed
    ],
    estimatedDurationHours: 24,
  },
  {
    id: 'zoo-road-choke',
    name: 'Zoo Road Drain Blockage (Silt & Trash)',
    badge: 'DRAIN BLOCKAGE',
    description: 'Heavy silt and debris choke the critical drain culvert at Zoo Road. Triggers rapid waterlogging and street flooding across Dispur.',
    iconName: 'ShieldAlert',
    rainfallIntensity: 85,
    drainageSystemEfficiency: 0.80,
    coastalSurgeHead: 0.1,
    brahmaputraFloodStageMeters: 48.6,
    sluiceGateOpen: true,
    pumpsOffline: false,
    blockedDrainCoordinates: [
      { x: 9, y: 6 }, // Zoo Road Confluence
      { x: 8, y: 5 }, // Anil Nagar culvert
    ],
    estimatedDurationHours: 24,
  },
];
