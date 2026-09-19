/**
 * FLOWSHIELD: Guwahati & Bahini/Bharalu Basin Crisis Scenarios
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
    description: 'Steady 25 mm/h precipitation over the Bahini-Bharalu basin. All 20 GMDA auto-priming pumps operational at nominal capacity. Bharalumukh sluice gate open.',
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
    name: 'Khasi Foothill Cloudburst Surge',
    badge: 'EXTREME SURGE',
    description: '125 mm/h cloudburst over the southern Khasi foothills. Torrential runoff funnels through Basistha and Jorabat into Dispur Capital Complex and Rukminigaon.',
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
    name: 'GMDA 20 Auto-Priming Pump Grid Blackout',
    badge: 'DISASTER: PUMPS DOWN',
    description: 'Power transmission outage knocks out all 20 GMDA auto-priming dewatering pumps during 75 mm/h rain. Rapid flash pooling in Anil Nagar, Nabin Nagar, and Rukminigaon.',
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
    name: 'Brahmaputra High Stage Sluice Lock',
    badge: 'RIVER BACKFLOW',
    description: 'Brahmaputra water level breaches Danger Mark (50.5m MSL) at Bharalumukh. Sluice gate closed to avert river entry, locking Bharalu urban discharge inside the city.',
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
    name: 'Zoo Road Bahini-Bharalu Debris Choke',
    badge: 'CULVERT SILTATION',
    description: 'Heavy silt and solid waste choke the critical Bahini-Bharalu transition culvert at Zoo Road Tiniali [x:9, y:6]. Triggers rapid backwater inundation in Dispur.',
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
