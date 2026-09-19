/**
 * HYDRO MATRIX: Guwahati Metropolitan Basin Topography Generator
 * Hyper-focused on the Bahini/Bharalu Basin & surrounding hydrological corridors.
 * 
 * Incorporates:
 * - 5 Government-Recognized Primary Drainage Channels:
 *   1. Bharalu
 *   2. Mora Bharalu
 *   3. Basistha
 *   4. Bahini
 *   5. Lakhimijan
 *   Plus receiving water body: The Brahmaputra River
 * - 18 Automatic Weather Stations (AWS) installed around Guwahati
 * - 20 GMDA Auto-Priming Dewatering Pumps deployed in vulnerable inundated hotspots
 * - Real topography: Nilachal Hills (Kamakhya), Narakasur Hills, Khasi-Jaintia foothills,
 *   Deepor Beel Ramsar wetland, and notorious low-lying flood bowls (Anil Nagar, Nabin Nagar,
 *   Rukminigaon, Tarun Nagar, Zoo Road, Hatigaon).
 */

import {
  GridNode,
  InfrastructureType,
  RecognizedDrainageChannel,
  DrainageChannelMeta,
  AutomaticWeatherStation,
  GMDAPumpStation,
} from '@/types/simulation';

export const GRID_WIDTH = 18;
export const GRID_HEIGHT = 18;
export const CELL_SIZE_METERS = 250; // 250m x 250m resolution
export const CELL_AREA_SQ_METERS = CELL_SIZE_METERS * CELL_SIZE_METERS; // 62,500 m²

/**
 * 5 Government-Recognized Primary Drainage Channels Metadata
 */
export const RECOGNIZED_CHANNELS: Record<RecognizedDrainageChannel, DrainageChannelMeta> = {
  Bharalu: {
    id: 'Bharalu',
    name: 'Bharalu River (ভৰলু)',
    assameseName: 'ভৰলু নদী',
    lengthKm: 6.2,
    origin: 'Confluence of Bahini at Zoo Road (R.G. Baruah Rd)',
    outfall: 'Brahmaputra River via Bharalumukh Sluice Gate',
    status: 'SILTED',
    waterDischargeM3S: 48.5,
    maxDesignCapacityM3S: 75.0,
    color: '#06b6d4', // Cyan
  },
  'Mora Bharalu': {
    id: 'Mora Bharalu',
    name: 'Mora Bharalu (মৰা ভৰলু)',
    assameseName: 'মৰা ভৰলু',
    lengthKm: 4.8,
    origin: 'Fatasil Ambari / Barsapara runoff corridor',
    outfall: 'Deepor Beel Wetland Basin',
    status: 'OPTIMAL',
    waterDischargeM3S: 28.0,
    maxDesignCapacityM3S: 50.0,
    color: '#3b82f6', // Electric Blue
  },
  Basistha: {
    id: 'Basistha',
    name: 'Basistha River (বশিষ্ঠ)',
    assameseName: 'বশিষ্ঠ নদী',
    lengthKm: 7.4,
    origin: 'Meghalaya / Khasi Foothills (Basistha Temple catchment)',
    outfall: 'Transitions into Bahini & flows toward Deepor Beel',
    status: 'OPTIMAL',
    waterDischargeM3S: 36.2,
    maxDesignCapacityM3S: 65.0,
    color: '#10b981', // Emerald
  },
  Bahini: {
    id: 'Bahini',
    name: 'Bahini River (বাহিনী)',
    assameseName: 'বাহিনী নদী',
    lengthKm: 5.6,
    origin: 'Basistha / Beltola confluence',
    outfall: 'Transitions into Bharalu at R.G. Baruah Road (Zoo Road)',
    status: 'CHOKED',
    waterDischargeM3S: 32.5,
    maxDesignCapacityM3S: 45.0,
    color: '#f59e0b', // Amber
  },
  Lakhimijan: {
    id: 'Lakhimijan',
    name: 'Lakhimijan Channel (লাখিমীজান)',
    assameseName: 'লাখিমীজান',
    lengthKm: 3.9,
    origin: 'Deepor Beel northern natural outlet',
    outfall: 'Brahmaputra River near Jalukbari / Gauhati University',
    status: 'BACKFLOW_RISK',
    waterDischargeM3S: 22.0,
    maxDesignCapacityM3S: 40.0,
    color: '#8b5cf6', // Violet
  },
  Brahmaputra: {
    id: 'Brahmaputra',
    name: 'Brahmaputra River (মহাবাহু ব্ৰহ্মপুত্ৰ)',
    assameseName: 'ব্ৰহ্মপুত্ৰ',
    lengthKm: 18.0,
    origin: 'Northern Metropolitan Water Boundary',
    outfall: 'Regional Arterial Drainage Sinks',
    status: 'OPTIMAL',
    waterDischargeM3S: 12500.0,
    maxDesignCapacityM3S: 35000.0,
    color: '#38bdf8', // Light Blue
  },
};

/**
 * 18 Automatic Weather Stations (AWS) installed around Guwahati
 */
export const GUWAHATI_AWS_STATIONS: AutomaticWeatherStation[] = [
  { id: 'aws-1', name: 'Dispur Secretariat AWS', gridX: 11, gridY: 9, stationCode: 'GHY-AWS-01', elevationMeters: 52.4, rainfallMmHr: 24.5, accumulatedRainfall24hMm: 68.2, humidityPercent: 92, temperatureCelsius: 27.2, barometricPressureHpa: 1004.2, windSpeedKmh: 14.5, batteryLevelPercent: 98, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-2', name: 'Panbazar (DC Office) AWS', gridX: 5, gridY: 3, stationCode: 'GHY-AWS-02', elevationMeters: 51.2, rainfallMmHr: 22.0, accumulatedRainfall24hMm: 58.0, humidityPercent: 89, temperatureCelsius: 28.0, barometricPressureHpa: 1005.1, windSpeedKmh: 11.2, batteryLevelPercent: 95, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-3', name: 'Jalukbari (Gauhati Univ) AWS', gridX: 2, gridY: 4, stationCode: 'GHY-AWS-03', elevationMeters: 54.0, rainfallMmHr: 18.5, accumulatedRainfall24hMm: 49.5, humidityPercent: 88, temperatureCelsius: 27.8, barometricPressureHpa: 1004.8, windSpeedKmh: 16.0, batteryLevelPercent: 92, status: 'ONLINE', lastPing: '1m ago' },
  { id: 'aws-4', name: 'Khanapara (Vet College) AWS', gridX: 15, gridY: 13, stationCode: 'GHY-AWS-04', elevationMeters: 61.5, rainfallMmHr: 38.0, accumulatedRainfall24hMm: 92.4, humidityPercent: 95, temperatureCelsius: 26.5, barometricPressureHpa: 1003.5, windSpeedKmh: 21.0, batteryLevelPercent: 88, status: 'WARNING', lastPing: 'Just now' },
  { id: 'aws-5', name: 'Borjhar (LGBI Airport) AWS', gridX: 1, gridY: 10, stationCode: 'GHY-AWS-05', elevationMeters: 51.8, rainfallMmHr: 19.2, accumulatedRainfall24hMm: 52.1, humidityPercent: 90, temperatureCelsius: 27.4, barometricPressureHpa: 1005.0, windSpeedKmh: 18.2, batteryLevelPercent: 100, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-6', name: 'Beltola Chariali AWS', gridX: 12, gridY: 12, stationCode: 'GHY-AWS-06', elevationMeters: 55.2, rainfallMmHr: 31.0, accumulatedRainfall24hMm: 78.6, humidityPercent: 93, temperatureCelsius: 26.9, barometricPressureHpa: 1004.0, windSpeedKmh: 12.8, batteryLevelPercent: 96, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-7', name: 'Chandmari Field AWS', gridX: 8, gridY: 4, stationCode: 'GHY-AWS-07', elevationMeters: 53.0, rainfallMmHr: 25.4, accumulatedRainfall24hMm: 64.0, humidityPercent: 91, temperatureCelsius: 27.5, barometricPressureHpa: 1004.5, windSpeedKmh: 9.5, batteryLevelPercent: 94, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-8', name: 'Zoo Road (R.G. Baruah) AWS', gridX: 9, gridY: 6, stationCode: 'GHY-AWS-08', elevationMeters: 50.1, rainfallMmHr: 35.8, accumulatedRainfall24hMm: 86.4, humidityPercent: 96, temperatureCelsius: 26.8, barometricPressureHpa: 1003.8, windSpeedKmh: 13.4, batteryLevelPercent: 91, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-9', name: 'Noonmati (IOCL Refinery) AWS', gridX: 14, gridY: 4, stationCode: 'GHY-AWS-09', elevationMeters: 56.4, rainfallMmHr: 26.0, accumulatedRainfall24hMm: 71.2, humidityPercent: 90, temperatureCelsius: 27.1, barometricPressureHpa: 1004.2, windSpeedKmh: 11.0, batteryLevelPercent: 97, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-10', name: 'Maligaon (NFR HQ) AWS', gridX: 3, gridY: 3, stationCode: 'GHY-AWS-10', elevationMeters: 52.8, rainfallMmHr: 21.0, accumulatedRainfall24hMm: 55.4, humidityPercent: 89, temperatureCelsius: 27.9, barometricPressureHpa: 1005.2, windSpeedKmh: 15.0, batteryLevelPercent: 93, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-11', name: 'Bharalumukh Sluice AWS', gridX: 5, gridY: 2, stationCode: 'GHY-AWS-11', elevationMeters: 49.5, rainfallMmHr: 28.5, accumulatedRainfall24hMm: 74.0, humidityPercent: 94, temperatureCelsius: 27.3, barometricPressureHpa: 1004.1, windSpeedKmh: 17.5, batteryLevelPercent: 99, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-12', name: 'Basistha Mandir AWS', gridX: 14, gridY: 15, stationCode: 'GHY-AWS-12', elevationMeters: 78.5, rainfallMmHr: 44.0, accumulatedRainfall24hMm: 112.5, humidityPercent: 98, temperatureCelsius: 25.2, barometricPressureHpa: 1002.8, windSpeedKmh: 24.0, batteryLevelPercent: 84, status: 'WARNING', lastPing: 'Just now' },
  { id: 'aws-13', name: 'Lalmati (ISBT) AWS', gridX: 9, gridY: 14, stationCode: 'GHY-AWS-13', elevationMeters: 53.6, rainfallMmHr: 29.2, accumulatedRainfall24hMm: 72.8, humidityPercent: 92, temperatureCelsius: 27.0, barometricPressureHpa: 1004.2, windSpeedKmh: 12.0, batteryLevelPercent: 95, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-14', name: 'Kahilipara Hill AWS', gridX: 8, gridY: 10, stationCode: 'GHY-AWS-14', elevationMeters: 68.2, rainfallMmHr: 33.4, accumulatedRainfall24hMm: 84.2, humidityPercent: 94, temperatureCelsius: 26.2, barometricPressureHpa: 1003.4, windSpeedKmh: 18.0, batteryLevelPercent: 90, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-15', name: 'Lokhra Chariali AWS', gridX: 7, gridY: 14, stationCode: 'GHY-AWS-15', elevationMeters: 54.1, rainfallMmHr: 27.8, accumulatedRainfall24hMm: 69.5, humidityPercent: 91, temperatureCelsius: 27.1, barometricPressureHpa: 1004.3, windSpeedKmh: 13.5, batteryLevelPercent: 96, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-16', name: 'Gorchuk Basin AWS', gridX: 5, gridY: 13, stationCode: 'GHY-AWS-16', elevationMeters: 51.5, rainfallMmHr: 30.2, accumulatedRainfall24hMm: 77.0, humidityPercent: 93, temperatureCelsius: 26.8, barometricPressureHpa: 1003.9, windSpeedKmh: 14.2, batteryLevelPercent: 92, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-17', name: 'VIP Road (Six Mile) AWS', gridX: 13, gridY: 8, stationCode: 'GHY-AWS-17', elevationMeters: 52.9, rainfallMmHr: 32.0, accumulatedRainfall24hMm: 80.4, humidityPercent: 94, temperatureCelsius: 26.9, barometricPressureHpa: 1004.0, windSpeedKmh: 12.6, batteryLevelPercent: 97, status: 'ONLINE', lastPing: 'Just now' },
  { id: 'aws-18', name: 'Hatigaon High School AWS', gridX: 11, gridY: 11, stationCode: 'GHY-AWS-18', elevationMeters: 50.8, rainfallMmHr: 36.5, accumulatedRainfall24hMm: 89.2, humidityPercent: 96, temperatureCelsius: 26.5, barometricPressureHpa: 1003.6, windSpeedKmh: 10.5, batteryLevelPercent: 89, status: 'ONLINE', lastPing: 'Just now' },
];

/**
 * 20 GMDA Auto-Priming Dewatering Pumps installed across vulnerable areas
 */
export const GMDA_PUMP_STATIONS: GMDAPumpStation[] = [
  { id: 'gmda-p1', name: 'Anil Nagar Heavy Pump #1', locationDescription: 'Anil Nagar By-lane 1 (Bharalu bank)', gridX: 8, gridY: 5, capacityM3Hr: 3000, dischargeM3Hr: 2850, rpm: 1480, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Bharalu' },
  { id: 'gmda-p2', name: 'Anil Nagar Heavy Pump #2', locationDescription: 'Anil Nagar Sluice point', gridX: 8, gridY: 5, capacityM3Hr: 3000, dischargeM3Hr: 2820, rpm: 1475, powerSource: 'DIESEL_GENSET', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.40, channelDischarge: 'Bharalu' },
  { id: 'gmda-p3', name: 'Nabin Nagar Outfall Pump #1', locationDescription: 'Nabin Nagar main culvert', gridX: 8, gridY: 6, capacityM3Hr: 2500, dischargeM3Hr: 2400, rpm: 1450, powerSource: 'GRID_ELECTRIC', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.25, channelDischarge: 'Bharalu' },
  { id: 'gmda-p4', name: 'Nabin Nagar Outfall Pump #2', locationDescription: 'Nabin Nagar-R.G. Baruah junction', gridX: 8, gridY: 6, capacityM3Hr: 2500, dischargeM3Hr: 2380, rpm: 1460, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.35, channelDischarge: 'Bharalu' },
  { id: 'gmda-p5', name: 'Bharalumukh Sluice Pump #1', locationDescription: 'Brahmaputra outfall gates', gridX: 5, gridY: 2, capacityM3Hr: 4500, dischargeM3Hr: 4400, rpm: 1520, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.20, channelDischarge: 'Brahmaputra' },
  { id: 'gmda-p6', name: 'Bharalumukh Sluice Pump #2', locationDescription: 'Brahmaputra riverside barrier', gridX: 5, gridY: 2, capacityM3Hr: 4500, dischargeM3Hr: 4350, rpm: 1510, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Brahmaputra' },
  { id: 'gmda-p7', name: 'Tarun Nagar Culvert Pump #1', locationDescription: 'Tarun Nagar link drain', gridX: 7, gridY: 6, capacityM3Hr: 2000, dischargeM3Hr: 1950, rpm: 1420, powerSource: 'DIESEL_GENSET', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Bharalu' },
  { id: 'gmda-p8', name: 'Tarun Nagar Culvert Pump #2', locationDescription: 'ABC Point underpass', gridX: 7, gridY: 6, capacityM3Hr: 2000, dischargeM3Hr: 1910, rpm: 1410, powerSource: 'GRID_ELECTRIC', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.40, channelDischarge: 'Bharalu' },
  { id: 'gmda-p9', name: 'Rukminigaon Bahini Pump #1', locationDescription: 'Rukminigaon Down Town culvert', gridX: 11, gridY: 8, capacityM3Hr: 2200, dischargeM3Hr: 2150, rpm: 1440, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Bahini' },
  { id: 'gmda-p10', name: 'Rukminigaon Bahini Pump #2', locationDescription: 'Satyajit Ray Path low basin', gridX: 11, gridY: 8, capacityM3Hr: 2200, dischargeM3Hr: 2100, rpm: 1430, powerSource: 'DIESEL_GENSET', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.45, channelDischarge: 'Bahini' },
  { id: 'gmda-p11', name: 'Dispur Last Gate Pump', locationDescription: 'Assam Secretariat boundary', gridX: 11, gridY: 9, capacityM3Hr: 1800, dischargeM3Hr: 1750, rpm: 1400, powerSource: 'GRID_ELECTRIC', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.25, channelDischarge: 'Bahini' },
  { id: 'gmda-p12', name: 'Supermarket Flyover Lowpoint', locationDescription: 'GS Road Supermarket underpass', gridX: 10, gridY: 8, capacityM3Hr: 2000, dischargeM3Hr: 1920, rpm: 1415, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Bahini' },
  { id: 'gmda-p13', name: 'Hatigaon Main Dewaterer', locationDescription: 'Hatigaon Chariali link canal', gridX: 11, gridY: 11, capacityM3Hr: 2400, dischargeM3Hr: 2320, rpm: 1450, powerSource: 'DIESEL_GENSET', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.35, channelDischarge: 'Bahini' },
  { id: 'gmda-p14', name: 'Zoo Road Tiniali Mobile Unit', locationDescription: 'R.G. Baruah Road confluence', gridX: 9, gridY: 6, capacityM3Hr: 1800, dischargeM3Hr: 1740, rpm: 1400, powerSource: 'DIESEL_GENSET', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Bharalu' },
  { id: 'gmda-p15', name: 'Barsapara Stadium Pump', locationDescription: 'Mora Bharalu entry basin', gridX: 6, gridY: 9, capacityM3Hr: 2200, dischargeM3Hr: 2120, rpm: 1440, powerSource: 'GRID_ELECTRIC', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.35, channelDischarge: 'Mora Bharalu' },
  { id: 'gmda-p16', name: 'Dhirenpara Sluice Dewaterer', locationDescription: 'Mora Bharalu mid-reach sluice', gridX: 5, gridY: 10, capacityM3Hr: 2500, dischargeM3Hr: 2420, rpm: 1460, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Mora Bharalu' },
  { id: 'gmda-p17', name: 'Lachit Nagar High-Velocity', locationDescription: 'Ulubari-Lachit Nagar drain', gridX: 7, gridY: 5, capacityM3Hr: 1800, dischargeM3Hr: 1720, rpm: 1390, powerSource: 'GRID_ELECTRIC', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Bharalu' },
  { id: 'gmda-p18', name: 'Gorchuk Basin Auto-Prime', locationDescription: 'NH-37 bypass interchange', gridX: 5, gridY: 13, capacityM3Hr: 2000, dischargeM3Hr: 1950, rpm: 1420, powerSource: 'DIESEL_GENSET', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.40, channelDischarge: 'Mora Bharalu' },
  { id: 'gmda-p19', name: 'Deepor Beel Inundation Pump', locationDescription: 'Mora Bharalu-Deepor Beel delta', gridX: 4, gridY: 11, capacityM3Hr: 2800, dischargeM3Hr: 2750, rpm: 1470, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.30, channelDischarge: 'Mora Bharalu' },
  { id: 'gmda-p20', name: 'Lakhimijan Outfall Discharge', locationDescription: 'Deepor Beel northward spillway', gridX: 2, gridY: 6, capacityM3Hr: 3200, dischargeM3Hr: 3100, rpm: 1490, powerSource: 'DUAL_HYBRID', autoPrimingArmed: true, status: 'ACTIVE', waterLevelTriggerMeters: 0.25, channelDischarge: 'Lakhimijan' },
];

/**
 * Procedural generation of Guwahati & Bahini/Bharalu basin grid
 */
export function generateCityGrid(): GridNode[] {
  const nodes: GridNode[] = [];

  // 1. Precise channel mapping coordinates (0-indexed 18x18 grid)
  const isBrahmaputra = (x: number, y: number) => y <= 1 && x >= 0 && x <= 17;

  // Bharalu channel: from Zoo Road (x:9, y:6) through Anil Nagar (x:8, y:5), Lachit Nagar (x:7, y:5), Ulubari/Athgaon (x:6, y:4), Bharalumukh (x:5, y:2) into Brahmaputra
  const isBharalu = (x: number, y: number) => {
    if (x === 9 && y === 6) return true; // Confluence
    if (x === 8 && y === 5) return true; // Anil Nagar
    if (x === 8 && y === 6) return true; // Nabin Nagar
    if (x === 7 && y === 5) return true; // Lachit Nagar
    if (x === 7 && y === 6) return true; // Tarun Nagar
    if (x === 6 && y === 4) return true; // Ulubari
    if (x === 6 && y === 3) return true; // Athgaon
    if (x === 5 && y === 2) return true; // Bharalumukh Sluice
    return false;
  };

  // Bahini channel: flows from Basistha/Beltola (x:13, y:12) through Rukminigaon (x:11, y:8), Dispur (x:11, y:9), Supermarket (x:10, y:8), meeting Bharalu at Zoo Road (x:9, y:6)
  const isBahini = (x: number, y: number) => {
    if (x === 13 && y === 12) return true; // Beltola
    if (x === 12 && y === 11) return true; // Six Mile Link
    if (x === 11 && y === 10) return true; // Dispur Down Town
    if (x === 11 && y === 9) return true;  // Dispur Last Gate
    if (x === 11 && y === 8) return true;  // Rukminigaon
    if (x === 10 && y === 7) return true;  // GS Road
    if (x === 10 && y === 8) return true;  // Supermarket
    if (x === 9 && y === 6) return true;   // Confluence into Bharalu
    return false;
  };

  // Basistha River: originates in Meghalaya / Khasi foothills (x:15, y:16), passes Basistha Chariali (x:14, y:14), Khanapara (x:15, y:13), feeding into Bahini at Beltola (x:13, y:12)
  const isBasistha = (x: number, y: number) => {
    if (x === 15 && y === 16) return true; // Foothill source
    if (x === 14 && y === 15) return true; // Basistha Temple
    if (x === 14 && y === 14) return true; // Basistha Chariali
    if (x === 15 && y === 13) return true; // Khanapara Runoff
    if (x === 13 && y === 13) return true; // Beltola South
    if (x === 13 && y === 12) return true; // Beltola confluence
    return false;
  };

  // Mora Bharalu: from Fatasil/Barsapara (x:6, y:8), Dhirenpara (x:5, y:10), draining westward into Deepor Beel (x:4, y:11)
  const isMoraBharalu = (x: number, y: number) => {
    if (x === 6 && y === 8) return true;  // Fatasil Ambari
    if (x === 6 && y === 9) return true;  // Barsapara
    if (x === 5 && y === 10) return true; // Dhirenpara
    if (x === 4 && y === 11) return true; // Deepor Beel Entry
    return false;
  };

  // Lakhimijan: Northern natural outlet from Deepor Beel (x:3, y:9), flowing north through Jalukbari (x:2, y:6), (x:2, y:4) to Brahmaputra (x:2, y:1)
  const isLakhimijan = (x: number, y: number) => {
    if (x === 3 && y === 9) return true; // Deepor Beel North
    if (x === 3 && y === 8) return true; // Borjhar link
    if (x === 2 && y === 7) return true; // Jalukbari South
    if (x === 2 && y === 6) return true; // Jalukbari University
    if (x === 2 && y === 4) return true; // Brahmaputra confluence
    return false;
  };

  // Deepor Beel Wetland Basin
  const isDeeporBeel = (x: number, y: number) => {
    return (x >= 2 && x <= 4 && y >= 10 && y <= 13);
  };

  // Guwahati Real-world Locality Map
  const getLocalityName = (x: number, y: number): { name: string; baseElev: number; pop: number; infra: InfrastructureType; infraName?: string } => {
    // North edge: Brahmaputra River
    if (y <= 1) {
      return { name: `Brahmaputra River Corridor [${x},${y}]`, baseElev: 48.2, pop: 120, infra: null };
    }

    // Northwest: Nilachal / Kamakhya Hills (elevated rocky granite hill)
    if (x <= 3 && y <= 4 && y > 1) {
      if (x === 2 && y === 2) {
        return { name: 'Kamakhya Temple (Nilachal Hill)', baseElev: 142.0, pop: 3500, infra: 'shelter', infraName: 'Kamakhya Hill Sacred Haven' };
      }
      return { name: `Nilachal Hill Ridge [${x},${y}]`, baseElev: 110.0, pop: 2200, infra: null };
    }

    // North Central: Bharalumukh Sluice Gate
    if (x === 5 && y === 2) {
      return { name: 'Bharalumukh Sluice Outfall', baseElev: 49.0, pop: 6500, infra: 'pumping_station', infraName: 'GMDA Bharalumukh Central Pumping Station' };
    }

    // Panbazar / Uzanbazar (DC Office, riverside district)
    if (x === 6 && y === 3) {
      return { name: 'Panbazar (DC Office & High Court)', baseElev: 52.4, pop: 8400, infra: 'government', infraName: 'Kamrup Metro District HQ' };
    }
    if (x === 7 && y === 3) {
      return { name: 'Uzanbazar / Latasil', baseElev: 53.0, pop: 7800, infra: null };
    }
    if (x === 8 && y === 4) {
      return { name: 'Chandmari Field & AEI Grounds', baseElev: 53.5, pop: 9200, infra: 'shelter', infraName: 'Chandmari Civil Defense Relief Camp' };
    }

    // Low-lying Inundation Hotspots: Anil Nagar, Nabin Nagar, Tarun Nagar, Lachit Nagar
    if (x === 8 && y === 5) {
      return { name: 'Anil Nagar (Critical Hotspot)', baseElev: 49.1, pop: 11500, infra: 'pumping_station', infraName: 'GMDA Anil Nagar Auto-Prime Pumping Grid' };
    }
    if (x === 8 && y === 6) {
      return { name: 'Nabin Nagar (Critical Hotspot)', baseElev: 49.2, pop: 11200, infra: 'pumping_station', infraName: 'GMDA Nabin Nagar Sluice & Pumping Station' };
    }
    if (x === 7 && y === 6) {
      return { name: 'Tarun Nagar Inundation Basin', baseElev: 49.5, pop: 9800, infra: 'pumping_station', infraName: 'Tarun Nagar Culvert Dewaterer' };
    }
    if (x === 7 && y === 5) {
      return { name: 'Lachit Nagar Commercial Sector', baseElev: 50.1, pop: 10400, infra: null };
    }
    if (x === 9 && y === 6) {
      return { name: 'Zoo Road Tiniali (Bahini-Bharalu Junc)', baseElev: 50.3, pop: 12500, infra: 'pumping_station', infraName: 'R.G. Baruah Confluence Flow Controller' };
    }

    // Bhangagarh / GMCH (Gauhati Medical College Hospital)
    if (x === 9 && y === 7) {
      return { name: 'GMCH Hospital (Bhangagarh)', baseElev: 54.5, pop: 14000, infra: 'hospital', infraName: 'Gauhati Medical College & Hospital (Apex)' };
    }

    // Dispur / Assam State Secretariat / Capital Complex
    if (x === 11 && y === 9) {
      return { name: 'Assam State Secretariat (Dispur Capital)', baseElev: 52.8, pop: 18500, infra: 'government', infraName: 'Janata Bhawan (Assam Secretariat Complex)' };
    }
    if (x === 11 && y === 8) {
      return { name: 'Rukminigaon (Bahini Overflow Zone)', baseElev: 49.8, pop: 12800, infra: 'pumping_station', infraName: 'GMDA Rukminigaon Auto-Priming Hub' };
    }
    if (x === 10 && y === 8) {
      return { name: 'GS Road Supermarket Junction', baseElev: 51.2, pop: 13500, infra: 'evacuation_route', infraName: 'GS Road Arterial Flyover Corridor' };
    }

    // Hatigaon & Sijubari
    if (x === 11 && y === 11) {
      return { name: 'Hatigaon Drainage Catchment', baseElev: 50.4, pop: 13200, infra: 'pumping_station', infraName: 'Hatigaon Auto-Priming Dewaterer' };
    }

    // Beltola & Six Mile
    if (x === 13 && y === 12) {
      return { name: 'Beltola Chariali Market Basin', baseElev: 54.8, pop: 11000, infra: null };
    }
    if (x === 13 && y === 8) {
      return { name: 'VIP Road / Six Mile Commercial', baseElev: 53.2, pop: 9500, infra: null };
    }

    // Khanapara / Jorabat Runoff Funnel
    if (x === 15 && y === 13) {
      return { name: 'Khanapara (Khasi Runoff Gateway)', baseElev: 62.0, pop: 6200, infra: 'shelter', infraName: 'Khanapara Field Emergency Evacuation Ground' };
    }

    // Basistha Hills / Temple Catchment (South Edge)
    if (x >= 13 && y >= 14) {
      return { name: `Basistha Foothills & Forest Catchment [${x},${y}]`, baseElev: 75.0 + (y - 14) * 15.0, pop: 1800, infra: null };
    }

    // Fatasil Ambari & Barsapara Stadium
    if (x === 6 && y === 9) {
      return { name: 'Barsapara Stadium (ACA Ground)', baseElev: 51.6, pop: 7500, infra: 'shelter', infraName: 'Barsapara Stadium Civil Defense Center' };
    }
    if (x === 5 && y === 10) {
      return { name: 'Dhirenpara (Mora Bharalu Corridor)', baseElev: 50.8, pop: 8900, infra: 'pumping_station', infraName: 'Dhirenpara Mora Bharalu Sluice' };
    }

    // Deepor Beel Ramsar Wetland
    if (isDeeporBeel(x, y)) {
      return { name: `Deepor Beel Ramsar Wetland Sanctuary [${x},${y}]`, baseElev: 47.8, pop: 450, infra: 'wetland', infraName: 'Deepor Beel Natural Retention Basin' };
    }

    // Jalukbari / Gauhati University (West)
    if (x === 2 && y === 6) {
      return { name: 'Gauhati University Campus (Jalukbari)', baseElev: 55.0, pop: 7200, infra: 'shelter', infraName: 'Gauhati University Auditorium Haven' };
    }

    // Default urban sector
    const elev = 51.0 + Math.sin(x * 0.5) * 3.5 + Math.cos(y * 0.5) * 2.8;
    return { name: `Guwahati Metro Sector [${x},${y}]`, baseElev: parseFloat(elev.toFixed(1)), pop: 5500, infra: null };
  };

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const id = `cell-${x}-${y}`;
      const locality = getLocalityName(x, y);

      // Determine channel assignment
      let channel: RecognizedDrainageChannel | null = null;
      if (isBrahmaputra(x, y)) channel = 'Brahmaputra';
      else if (isBharalu(x, y)) channel = 'Bharalu';
      else if (isBahini(x, y)) channel = 'Bahini';
      else if (isBasistha(x, y)) channel = 'Basistha';
      else if (isMoraBharalu(x, y)) channel = 'Mora Bharalu';
      else if (isLakhimijan(x, y)) channel = 'Lakhimijan';

      // Check if AWS station is at this coordinate
      const aws = GUWAHATI_AWS_STATIONS.find(s => s.gridX === x && s.gridY === y);

      // Check if GMDA pump is at this coordinate
      const pump = GMDA_PUMP_STATIONS.find(p => p.gridX === x && p.gridY === y);

      // Permeability: concrete urban sectors low (0.06), wetland high (0.85), hills moderate (0.50)
      let permeability = 0.12;
      if (isDeeporBeel(x, y)) permeability = 0.85;
      else if (locality.baseElev > 70) permeability = 0.48;
      else if (locality.infra === 'government' || locality.infra === 'hospital') permeability = 0.05;

      // Base water level: Brahmaputra and primary channels maintain continuous baseline discharge
      let baseWater = 0.0;
      if (channel === 'Brahmaputra') baseWater = 1.20; // Brahmaputra perennial river stage
      else if (channel === 'Bharalu' || channel === 'Bahini') baseWater = 0.35; // Perennial urban wastewater & base discharge
      else if (channel === 'Basistha') baseWater = 0.25;
      else if (isDeeporBeel(x, y)) baseWater = 0.60;

      // Status initialization
      const status = baseWater >= 0.75 ? 'CRITICAL' : baseWater >= 0.25 ? 'WARNING' : 'SAFE';
      const cap = channel ? 45.0 : 25.0;

      nodes.push({
        id,
        x,
        y,
        name: locality.name,
        locality: locality.name,
        elevation: locality.baseElev,
        waterDepth: baseWater,
        currentWaterLevel: baseWater,
        capacity: cap,
        drainageCapacity: cap,
        channelType: channel || 'none',
        totalElevation: parseFloat((locality.baseElev + baseWater).toFixed(2)),
        effectiveDrainage: cap,
        permeability,
        population: locality.pop,
        inflowRate: 0,
        outflowRate: 0,
        waterLevelDelta: 0,
        flowVector: { vx: 0, vy: 0, speed: 0 },
        status,
        timeToCriticalMinutes: null,
        drainBlocked: false,
        barrierActive: false,
        barrierHeight: 1.0,
        infrastructure: locality.infra,
        infrastructureName: locality.infraName,
        evacuationOrdered: false,
        channel,
        awsStationId: aws ? aws.id : undefined,
        gmdaPumpId: pump ? pump.id : undefined,
      });
    }
  }

  return nodes;
}

/**
 * Returns the Guwahati city grid as an 18x18 2D array: grid[y][x]
 */
export function generateCityGrid2D(): GridNode[][] {
  const flat = generateCityGrid();
  const grid2D: GridNode[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row: GridNode[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      row.push(flat[y * GRID_WIDTH + x]);
    }
    grid2D.push(row);
  }
  return grid2D;
}
