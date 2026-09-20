/**
 * HYDRO MATRIX: Rescue Camp Intelligence & Placement Engine
 * Localization: Guwahati — Bahini/Bharalu Basin & Regional High Grounds
 * 
 * Hydrological Placement Algorithm:
 * Evaluates discrete grid elevation (MSL), live dynamic inundation depth (h),
 * proximity to inundated population bowls (Anil Nagar, Nabin Nagar, Rukminigaon,
 * Zoo Road, Hatigaon), road connectivity, and distance from Brahmaputra backflow.
 */

import {
  GridNode,
  RescueCamp,
  RescueCampType,
  RescueCampStatus,
  CampRecommendationSite,
} from '@/types/simulation';

/**
 * Pre-calibrated landmark rescue sanctuaries across Guwahati's natural high-elevation zones.
 */
export const DEFAULT_LANDMARK_CAMPS: RescueCamp[] = [
  {
    id: 'camp-kamakhya',
    name: 'Kamakhya Hill Sacred Haven',
    assameseName: 'কামাখ্যা আশ্ৰয় শিবিৰ',
    type: 'APEX_MEDICAL',
    gridX: 2,
    gridY: 2,
    elevationMeters: 142.0,
    capacity: 5000,
    currentOccupancy: 1250,
    status: 'OPERATIONAL',
    contactPerson: 'Col. S. Bordoloi (NDRF 1st Bn Command)',
    contactPhone: '+91 361 254 0101',
    supplies: {
      foodRationsDays: 7,
      potableWaterLiters: 35000,
      medicalKits: 850,
      rescueBoats: 4,
      powerGenerators: 4,
      sanitationUnits: 40,
      blanketsAndBeds: 4500,
    },
    coveredSectorIds: ['cell-1-2', 'cell-2-2', 'cell-3-2', 'cell-2-3', 'cell-3-3'],
    establishedTick: 0,
    isRecommended: true,
  },
  {
    id: 'camp-khanapara',
    name: 'Khanapara Field Emergency Evacuation Complex',
    assameseName: 'খানাপাৰা জৰুৰীকালীন শিবিৰ',
    type: 'MASS_SHELTER',
    gridX: 15,
    gridY: 13,
    elevationMeters: 62.0,
    capacity: 6500,
    currentOccupancy: 2100,
    status: 'OPERATIONAL',
    contactPerson: 'Capt. B. Kalita (Assam Rifles / SDRF Staging)',
    contactPhone: '+91 361 223 7099',
    supplies: {
      foodRationsDays: 6,
      potableWaterLiters: 42000,
      medicalKits: 600,
      rescueBoats: 6,
      powerGenerators: 5,
      sanitationUnits: 50,
      blanketsAndBeds: 6000,
    },
    coveredSectorIds: ['cell-14-13', 'cell-15-13', 'cell-15-14', 'cell-14-14', 'cell-13-12'],
    establishedTick: 0,
    isRecommended: true,
  },
  {
    id: 'camp-chandmari',
    name: 'Chandmari AEI Grounds Civil Relief Base',
    assameseName: 'চান্দমাৰী সাহায্য শিবিৰ',
    type: 'SUPPLY_DISTRIBUTION',
    gridX: 8,
    gridY: 4,
    elevationMeters: 53.5,
    capacity: 4000,
    currentOccupancy: 950,
    status: 'OPERATIONAL',
    contactPerson: 'Dr. P. Goswami (Kamrup Metro DDMA Relief)',
    contactPhone: '+91 361 266 1022',
    supplies: {
      foodRationsDays: 5,
      potableWaterLiters: 28000,
      medicalKits: 450,
      rescueBoats: 3,
      powerGenerators: 3,
      sanitationUnits: 30,
      blanketsAndBeds: 3800,
    },
    coveredSectorIds: ['cell-7-4', 'cell-8-4', 'cell-9-4', 'cell-8-3', 'cell-8-5'],
    establishedTick: 0,
    isRecommended: true,
  },
  {
    id: 'camp-gauhati-univ',
    name: 'Gauhati University Ridge Safe Haven',
    assameseName: 'গুৱাহাটী বিশ্ববিদ্যালয় শিবিৰ',
    type: 'MASS_SHELTER',
    gridX: 2,
    gridY: 6,
    elevationMeters: 55.0,
    capacity: 4500,
    currentOccupancy: 1100,
    status: 'OPERATIONAL',
    contactPerson: 'Prof. D. Saikia (Campus Relief Coordinator)',
    contactPhone: '+91 361 257 0411',
    supplies: {
      foodRationsDays: 8,
      potableWaterLiters: 30000,
      medicalKits: 500,
      rescueBoats: 5,
      powerGenerators: 4,
      sanitationUnits: 35,
      blanketsAndBeds: 4200,
    },
    coveredSectorIds: ['cell-2-5', 'cell-2-6', 'cell-2-7', 'cell-3-6', 'cell-1-6'],
    establishedTick: 0,
    isRecommended: true,
  },
  {
    id: 'camp-barsapara',
    name: 'Barsapara ACA Stadium Tactical Base',
    assameseName: 'বৰ্ষাপাৰা ষ্টেডিয়াম সাহায্য কেন্দ্ৰ',
    type: 'NDRF_TACTICAL_BASE',
    gridX: 6,
    gridY: 9,
    elevationMeters: 51.6,
    capacity: 5500,
    currentOccupancy: 1450,
    status: 'OPERATIONAL',
    contactPerson: 'Insp. R. Hazarika (NDRF Water Triage Base)',
    contactPhone: '+91 361 247 8820',
    supplies: {
      foodRationsDays: 6,
      potableWaterLiters: 38000,
      medicalKits: 750,
      rescueBoats: 8,
      powerGenerators: 6,
      sanitationUnits: 45,
      blanketsAndBeds: 5000,
    },
    coveredSectorIds: ['cell-5-9', 'cell-6-9', 'cell-7-9', 'cell-6-8', 'cell-6-10'],
    establishedTick: 0,
    isRecommended: true,
  },
];

/**
 * Calculates hydrological suitability of any cell for deploying a rescue camp.
 * Returns score 0-100, reasons, and nearby affected population.
 */
export function calculateCampSuitability(
  candidate: GridNode,
  allCells: GridNode[],
  existingCamps: RescueCamp[] = []
): {
  score: number;
  reason: string;
  nearbyAtRiskPop: number;
  roadAccess: string;
  suggestedType: RescueCampType;
  suggestedCapacity: number;
} {
  // 1. Hard Disqualifiers:
  // Water accumulation > 0.12m is hazardous for camp pitching
  if (candidate.currentWaterLevel > 0.12) {
    return {
      score: 0,
      reason: `Unsafe: Sector submerged under ${candidate.currentWaterLevel.toFixed(2)}m flood water.`,
      nearbyAtRiskPop: 0,
      roadAccess: 'Submerged / Impassable',
      suggestedType: 'MASS_SHELTER',
      suggestedCapacity: 0,
    };
  }

  // Northern Brahmaputra river channel corridor is ineligible
  if (candidate.y <= 1 || candidate.name.toLowerCase().includes('brahmaputra')) {
    return {
      score: 0,
      reason: 'Ineligible: Northern receiving river channel corridor.',
      nearbyAtRiskPop: 0,
      roadAccess: 'Riverbed / Waterway',
      suggestedType: 'NDRF_TACTICAL_BASE',
      suggestedCapacity: 0,
    };
  }

  // Deepor Beel wetland basin is water retention zone
  if (candidate.infrastructure === 'wetland' || candidate.name.toLowerCase().includes('deepor beel')) {
    return {
      score: 0,
      reason: 'Ineligible: Natural Ramsar wetland retention basin.',
      nearbyAtRiskPop: 0,
      roadAccess: 'Marshland',
      suggestedType: 'MASS_SHELTER',
      suggestedCapacity: 0,
    };
  }

  // Check if a camp already occupies this exact cell
  const alreadyHasCamp = existingCamps.some(
    c => c.gridX === candidate.x && c.gridY === candidate.y
  );
  if (alreadyHasCamp) {
    return {
      score: 0,
      reason: 'Already Commissioned: Active rescue camp operating at this site.',
      nearbyAtRiskPop: 0,
      roadAccess: 'Established Camp Corridor',
      suggestedType: 'MASS_SHELTER',
      suggestedCapacity: 0,
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // 2. Inundation Safety Factor (0 to 35 pts)
  if (candidate.currentWaterLevel === 0) {
    score += 35;
    reasons.push('100% Dry ground (0.00m depth)');
  } else if (candidate.currentWaterLevel <= 0.05) {
    score += 24;
    reasons.push('Trace ponding (<0.05m)');
  } else {
    score += 10;
    reasons.push('Minor surface runoff');
  }

  // 3. Elevation Headroom Factor (0 to 30 pts)
  // Baseline Guwahati flood level is ~49.0m - 50.5m. Elevation >= 53m offers excellent immunity.
  if (candidate.elevation >= 70.0) {
    score += 30;
    reasons.push(`Superior hill elevation (${candidate.elevation.toFixed(1)}m MSL)`);
  } else if (candidate.elevation >= 55.0) {
    score += 26;
    reasons.push(`Elevated ridge (${candidate.elevation.toFixed(1)}m MSL)`);
  } else if (candidate.elevation >= 52.5) {
    score += 20;
    reasons.push(`Above standard flood plain (${candidate.elevation.toFixed(1)}m MSL)`);
  } else if (candidate.elevation >= 51.0) {
    score += 12;
    reasons.push(`Moderate elevation (${candidate.elevation.toFixed(1)}m MSL)`);
  } else {
    score += 4;
    reasons.push(`Low-lying boundary (${candidate.elevation.toFixed(1)}m MSL)`);
  }

  // 4. Proximity & Accessibility to High-Need Inundated Bowls (0 to 25 pts)
  // We scan all sectors within Chebyshev distance of 1 to 4 cells
  let nearbyAtRiskPop = 0;
  let criticalNeighborCount = 0;

  for (const other of allCells) {
    const dx = Math.abs(other.x - candidate.x);
    const dy = Math.abs(other.y - candidate.y);
    const dist = Math.max(dx, dy);

    if (dist >= 1 && dist <= 3) {
      if (other.status === 'CRITICAL' || other.currentWaterLevel >= 0.75) {
        nearbyAtRiskPop += other.population;
        criticalNeighborCount++;
      } else if (other.status === 'WARNING' || other.currentWaterLevel >= 0.25) {
        nearbyAtRiskPop += Math.round(other.population * 0.4);
      }
    }
  }

  if (criticalNeighborCount >= 2 || nearbyAtRiskPop > 15000) {
    score += 25;
    reasons.push(`High tactical priority: within reach of ${nearbyAtRiskPop.toLocaleString()} distressed citizens`);
  } else if (nearbyAtRiskPop > 5000) {
    score += 18;
    reasons.push(`Serves adjacent vulnerable sectors (${nearbyAtRiskPop.toLocaleString()} residents)`);
  } else if (nearbyAtRiskPop > 1000) {
    score += 10;
    reasons.push('Covers local peripheral population');
  } else {
    score += 5;
    reasons.push('Quiet perimeter zone');
  }

  // 5. Strategic Infrastructure & Road Connectivity (0 to 10 pts)
  let roadAccess = 'Local Arterial Road';
  let suggestedType: RescueCampType = 'MASS_SHELTER';
  let suggestedCapacity = 3500;

  if (candidate.infrastructure === 'hospital' || candidate.name.toLowerCase().includes('gmch')) {
    score += 10;
    reasons.push('Direct access to Apex GMCH trauma facilities');
    roadAccess = 'GS Road Ambulance Flyover Corridor';
    suggestedType = 'APEX_MEDICAL';
    suggestedCapacity = 5000;
  } else if (candidate.infrastructure === 'shelter' || candidate.name.toLowerCase().includes('field') || candidate.name.toLowerCase().includes('stadium')) {
    score += 10;
    reasons.push('Designated open ground footprint for helipad & mass tenting');
    roadAccess = 'National Highway / Four-lane Corridor';
    suggestedType = 'MASS_SHELTER';
    suggestedCapacity = 6000;
  } else if (candidate.name.toLowerCase().includes('secretariat') || candidate.name.toLowerCase().includes('dispur')) {
    score += 8;
    reasons.push('Government capital district with dedicated backup grid');
    roadAccess = 'Capital Ring Expressway';
    suggestedType = 'SUPPLY_DISTRIBUTION';
    suggestedCapacity = 4500;
  } else if (candidate.x <= 4 && candidate.elevation > 50) {
    roadAccess = 'Jalukbari Bypass / Airport Highway';
    suggestedType = 'NDRF_TACTICAL_BASE';
    suggestedCapacity = 4000;
  }

  // 6. Proximity Penalty to Existing Camps (to encourage strategic spatial dispersion)
  for (const camp of existingCamps) {
    const dist = Math.hypot(candidate.x - camp.gridX, candidate.y - camp.gridY);
    if (dist <= 1.5) {
      score = Math.max(10, score - 22);
      reasons.push(`Proximity overlap with ${camp.name}`);
      break;
    }
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
    score: finalScore,
    reason: reasons.slice(0, 3).join(' • '),
    nearbyAtRiskPop,
    roadAccess,
    suggestedType,
    suggestedCapacity,
  };
}

/**
 * Returns ranked list of top candidate sites across Guwahati for deploying rescue camps.
 */
export function getRecommendedCampSites(
  allCells: GridNode[],
  existingCamps: RescueCamp[],
  maxRecommendations: number = 6
): CampRecommendationSite[] {
  const recommendations: CampRecommendationSite[] = [];

  for (const cell of allCells) {
    const evalResult = calculateCampSuitability(cell, allCells, existingCamps);
    if (evalResult.score >= 50) {
      recommendations.push({
        gridX: cell.x,
        gridY: cell.y,
        cellId: cell.id,
        name: `${cell.name.replace(/\[\d+,\d+\]/, '').trim()}`,
        elevationMeters: cell.elevation,
        currentWaterLevel: cell.currentWaterLevel,
        suitabilityScore: evalResult.score,
        suitabilityReason: evalResult.reason,
        nearbyPopulationAtRisk: evalResult.nearbyAtRiskPop,
        nearestRoadAccess: evalResult.roadAccess,
        suggestedCampType: evalResult.suggestedType,
        suggestedCapacity: evalResult.suggestedCapacity,
        recommendedSupplies: {
          foodRationsDays: 6,
          potableWaterLiters: Math.round(evalResult.suggestedCapacity * 6.5),
          medicalKits: Math.round(evalResult.suggestedCapacity * 0.12),
          rescueBoats: evalResult.suggestedType === 'NDRF_TACTICAL_BASE' ? 8 : 4,
          powerGenerators: 4,
          sanitationUnits: Math.round(evalResult.suggestedCapacity * 0.008),
          blanketsAndBeds: Math.round(evalResult.suggestedCapacity * 0.9),
        },
      });
    }
  }

  // Sort descending by suitability score
  recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  // Return top N diverse recommendations
  return recommendations.slice(0, maxRecommendations);
}

/**
 * Finds the nearest operational safe camp for a given grid sector.
 */
export function getNearestSafeCamp(
  cell: GridNode,
  camps: RescueCamp[]
): {
  camp: RescueCamp | null;
  distanceKm: number;
  routeSafe: boolean;
  statusText: string;
} {
  const eligibleCamps = camps.filter(
    c => c.status === 'OPERATIONAL' || c.status === 'NEAR_CAPACITY'
  );

  if (eligibleCamps.length === 0) {
    return {
      camp: null,
      distanceKm: 0,
      routeSafe: false,
      statusText: 'No operational rescue camps currently available in the basin.',
    };
  }

  let bestCamp: RescueCamp | null = null;
  let minDistance = Infinity;

  for (const camp of eligibleCamps) {
    const dist = Math.hypot(cell.x - camp.gridX, cell.y - camp.gridY);
    if (dist < minDistance) {
      minDistance = dist;
      bestCamp = camp;
    }
  }

  if (!bestCamp) {
    return {
      camp: null,
      distanceKm: 0,
      routeSafe: false,
      statusText: 'No viable camp route.',
    };
  }

  const distanceKm = parseFloat((minDistance * 0.25).toFixed(2)); // Each cell is 250m = 0.25km
  const hasRemainingBeds = bestCamp.currentOccupancy < bestCamp.capacity;
  const routeSafe = cell.currentWaterLevel < 0.75;

  return {
    camp: bestCamp,
    distanceKm,
    routeSafe,
    statusText: hasRemainingBeds
      ? `${distanceKm} km to ${bestCamp.name} (${bestCamp.capacity - bestCamp.currentOccupancy} beds available)`
      : `${bestCamp.name} is near capacity (${bestCamp.currentOccupancy}/${bestCamp.capacity})`,
  };
}

/**
 * Checks all active camps against real-time simulated water levels.
 * Flags flood encroachment warnings or required relocations.
 */
export function checkCampFloodHazards(
  camps: RescueCamp[],
  allCells: GridNode[]
): RescueCamp[] {
  const cellMap = new Map<string, GridNode>();
  for (const c of allCells) {
    cellMap.set(`cell-${c.x}-${c.y}`, c);
  }

  return camps.map(camp => {
    const cell = cellMap.get(`cell-${camp.gridX}-${camp.gridY}`);
    const waterDepth = cell ? cell.currentWaterLevel : 0;

    let status: RescueCampStatus = camp.status;
    let riskAlert: string | undefined = undefined;

    if (waterDepth >= 0.40) {
      status = 'COMPROMISED';
      riskAlert = `CRITICAL: Water level reached ${waterDepth.toFixed(2)}m! Immediate emergency evacuation & camp relocation required.`;
    } else if (waterDepth >= 0.15) {
      status = 'AT_RISK_FLOODING';
      riskAlert = `WARNING: Flood water encroaching (${waterDepth.toFixed(2)}m). Prepare secondary elevated relocation site.`;
    } else if (camp.currentOccupancy >= camp.capacity) {
      status = 'AT_CAPACITY';
      riskAlert = 'Shelter at 100% capacity. Divert subsequent evacuees to adjacent hubs.';
    } else if (camp.currentOccupancy >= camp.capacity * 0.85) {
      status = 'NEAR_CAPACITY';
    } else {
      status = 'OPERATIONAL';
    }

    return {
      ...camp,
      status,
      riskAlert,
    };
  });
}
