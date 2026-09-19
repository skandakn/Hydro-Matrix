/**
 * FLOWSHIELD: Predefined Crisis Scenarios & Disaster Injectors
 * 
 * Includes calibrated presets for:
 * 1. Normal Seasonal Rain (Baseline stability)
 * 2. Heavy 100-Year Cloudburst (Widespread urban inundation)
 * 3. Municipal Drainage Infrastructure Blackout (Pump failure disaster)
 * 4. River Channel Debris Choke (Backwater surge)
 * 5. Coastal Typhoon Surge (Ocean boundary barrier failure)
 */

import { ScenarioPreset } from '@/types/simulation';

export const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'normal-rain',
    name: 'Normal Monsoon Baseline',
    badge: 'BASELINE',
    description: 'Steady 22 mm/h precipitation. Municipal stormwater drainage operates at 100% capacity. Runoff remains within canal channels.',
    iconName: 'CloudRain',
    rainfallIntensity: 22,
    drainageSystemEfficiency: 1.0,
    coastalSurgeHead: 0.0,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 4,
  },
  {
    id: 'heavy-cloudburst',
    name: '100-Year Cloudburst',
    badge: 'EXTREME',
    description: 'High-volume convective storm at 115 mm/h. Overwhelms surface absorption, causing rapid accumulation in South Metro Basin and downtown underpasses.',
    iconName: 'CloudLightning',
    rainfallIntensity: 115,
    drainageSystemEfficiency: 0.90,
    coastalSurgeHead: 0.2,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 3,
  },
  {
    id: 'drainage-failure',
    name: 'Critical Pump Grid Failure',
    badge: 'DISASTER INJECTED',
    description: 'Electrical substation blackout knocks out 80% of municipal stormwater pumps during severe 65 mm/h storm. Water rapidly backs up into residential zones.',
    iconName: 'AlertOctagon',
    rainfallIntensity: 65,
    drainageSystemEfficiency: 0.20,
    coastalSurgeHead: 0.1,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 5,
  },
  {
    id: 'blocked-channel',
    name: 'Canal Debris Choke & Flash Flood',
    badge: 'LOCALIZED HAZARD',
    description: 'Debris dam obstructs primary discharge culvert at [x:7, y:9]. Creates intense hydraulic backwater pooling directly threatening the financial district.',
    iconName: 'ShieldAlert',
    rainfallIntensity: 85,
    drainageSystemEfficiency: 0.85,
    coastalSurgeHead: 0.0,
    blockedDrainCoordinates: [
      { x: 7, y: 9 },
      { x: 8, y: 9 },
      { x: 7, y: 10 },
    ],
    estimatedDurationHours: 4,
  },
  {
    id: 'typhoon-surge',
    name: 'Category 4 Typhoon & Surge',
    badge: 'CATASTROPHIC',
    description: '145 mm/h torrential rain combined with a 1.2m coastal storm surge holding back river discharge, driving saltwater inundation inland.',
    iconName: 'Waves',
    rainfallIntensity: 145,
    drainageSystemEfficiency: 0.70,
    coastalSurgeHead: 1.2,
    blockedDrainCoordinates: [],
    estimatedDurationHours: 6,
  },
];
