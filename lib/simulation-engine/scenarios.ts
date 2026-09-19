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

export const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'guwahati-monsoon',
    name: 'Guwahati Monsoon Baseline',
    badge: 'GMDA BASELINE',
    description: 'Steady 25 mm/h rain over the Bahini-Bharalu basin. All 20 GMDA auto-priming pumps operational at normal capacity. Bharalumukh flood gate open for natural drainage.',
    iconName: 'CloudRain',
    rainfallIntensity: 25,
    drainageSystemEfficiency: 1.0,
    coastalSurgeHead: 0.0,
    brahmaputraFloodStageMeters: 48.2,
    sluiceGateOpen: true,
    pumpsOffline: false,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 4,
  },
  {
    id: 'meghalaya-cloudburst',
    name: 'Khasi Hills Cloudburst Downpour',
    badge: 'EXTREME HILL RAIN',
    description: '125 mm/h sudden cloudburst over the southern Khasi hills. Heavy runoff funnels through Basistha and Jorabat into Dispur Capital Complex and Rukminigaon.',
    iconName: 'CloudLightning',
    rainfallIntensity: 125,
    drainageSystemEfficiency: 0.90,
    coastalSurgeHead: 0.3,
    brahmaputraFloodStageMeters: 49.0,
    sluiceGateOpen: true,
    pumpsOffline: false,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 3,
  },
  {
    id: 'gmda-pumps-failure',
    name: 'GMDA 20 Pump Power Outage',
    badge: 'POWER OUTAGE: PUMPS DOWN',
    description: 'Electrical power outage halts all 20 GMDA drainage pumps during heavy 75 mm/h rain. Rapid waterlogging and street flooding in Anil Nagar, Nabin Nagar, and Rukminigaon.',
    iconName: 'AlertOctagon',
    rainfallIntensity: 75,
    drainageSystemEfficiency: 0.15,
    coastalSurgeHead: 0.2,
    brahmaputraFloodStageMeters: 49.2,
    sluiceGateOpen: true,
    pumpsOffline: true,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 5,
  },
  {
    id: 'brahmaputra-backflow',
    name: 'Brahmaputra River Rise & Flood Gate Closed',
    badge: 'RIVER BARRIER ACTIVE',
    description: 'Brahmaputra water level breaches Danger Mark (50.5m) at Bharalumukh. Flood gate closed to block river from entering the city, trapping internal rainwater inside.',
    iconName: 'Waves',
    rainfallIntensity: 60,
    drainageSystemEfficiency: 0.45,
    coastalSurgeHead: 1.8,
    brahmaputraFloodStageMeters: 50.8,
    sluiceGateOpen: false,
    pumpsOffline: false,
    blockedDrainCoordinates: [
      { x: 5, y: 2 }, // Bharalumukh outfall closed
    ],
    estimatedDurationHours: 6,
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
    estimatedDurationHours: 4,
  },
];
