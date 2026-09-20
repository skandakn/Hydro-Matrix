"""
HYDRO MATRIX : Multi-Criteria Spatial Decision Analysis (MCDA / AHP) Engine
Autonomous Relief Camp Placement and Supply Allocation using 2D SciPy Convolution.
"""

import numpy as np
from scipy.signal import convolve2d
from typing import List, Dict, Any
from backend.simulation.city_grid import (
    GRID_WIDTH,
    GRID_HEIGHT,
    GUWAHATI_TOPOGRAPHY_GRID,
)

# Benchmark landmark high-ground sanctuaries
LANDMARK_SHELTERS: List[Dict[str, Any]] = [
    {
        "id": "camp_kamakhya",
        "name": "Kamakhya Hill Temple Sanctuary",
        "grid_x": 2,
        "grid_y": 2,
        "elevation_msl": 142.0,
        "capacity": 5000,
        "camp_type": "APEX_MEDICAL_SHELTER",
    },
    {
        "id": "camp_khanapara",
        "name": "Khanapara Field Emergency Complex",
        "grid_x": 15,
        "grid_y": 13,
        "elevation_msl": 61.5,
        "capacity": 6500,
        "camp_type": "MASS_EVACUATION_CAMP",
    },
    {
        "id": "camp_chandmari",
        "name": "Chandmari AEI Grounds Relief Hub",
        "grid_x": 8,
        "grid_y": 4,
        "elevation_msl": 53.0,
        "capacity": 4000,
        "camp_type": "SUPPLY_DISTRIBUTION_BASE",
    },
    {
        "id": "camp_gauhati_univ",
        "name": "Gauhati University Ridge Camp",
        "grid_x": 2,
        "grid_y": 6,
        "elevation_msl": 55.0,
        "capacity": 4500,
        "camp_type": "MASS_EVACUATION_CAMP",
    },
    {
        "id": "camp_barsapara",
        "name": "Barsapara ACA Stadium Tactical Base",
        "grid_x": 6,
        "grid_y": 9,
        "elevation_msl": 51.6,
        "capacity": 5500,
        "camp_type": "NDRF_WATER_TRIAGE",
    },
]


def compute_suitability_matrix(
    current_depth_matrix: np.ndarray,
    topography_grid: np.ndarray = GUWAHATI_TOPOGRAPHY_GRID
) -> np.ndarray:
    """
    Computes suitability score S(x, y) in [0, 100]:
    S = Phi_dry(H) + Phi_elev(Z) + Phi_distress(P) + Phi_infra - Psi_overlap
    """
    S = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=np.float64)

    # 1. Hard Disqualifications: Inundated (> 0.12m) or Riverbed (Rows 0-1)
    ineligible = (current_depth_matrix > 0.12) | (topography_grid < 50.0)
    ineligible[0:2, :] = True

    # 2. Dry Ground Score (0-35 points)
    phi_dry = np.where(
        current_depth_matrix == 0.0, 35.0,
        np.where(current_depth_matrix <= 0.05, 24.0, 10.0)
    )

    # 3. Elevation Headroom Score (0-30 points)
    phi_elev = np.where(
        topography_grid >= 70.0, 30.0,
        np.where(topography_grid >= 55.0, 26.0,
        np.where(topography_grid >= 52.5, 20.0,
        np.where(topography_grid >= 51.0, 12.0, 4.0)))
    )

    # 4. Chebyshev 2D Spatial Convolution for Distressed Citizens
    # Kernel radius 3 = 7x7 grid covering 750m in every direction
    kernel = np.ones((7, 7), dtype=np.float64)
    kernel[3, 3] = 0.0  # Exclude self

    # Population density proxy
    pop_density = np.full((GRID_HEIGHT, GRID_WIDTH), 3500.0)
    pop_density[0:2, :] = 0.0
    distress_intensity = np.where(
        current_depth_matrix >= 0.75, pop_density * 1.0,
        np.where(current_depth_matrix >= 0.25, pop_density * 0.4, 0.0)
    )

    citizens_in_reach = convolve2d(distress_intensity, kernel, mode="same", boundary="fill", fillvalue=0)

    phi_distress = np.where(
        citizens_in_reach > 12000, 25.0,
        np.where(citizens_in_reach > 5000, 18.0,
        np.where(citizens_in_reach > 1000, 10.0, 5.0))
    )

    # Combine factors
    S = phi_dry + phi_elev + phi_distress
    S[ineligible] = 0.0

    return np.clip(np.round(S), 0.0, 100.0)


def compute_ranked_camp_sites(top_n: int = 6) -> List[Dict[str, Any]]:
    """
    Ranks top diverse candidate sites across Guwahati and calculates required relief supplies.
    """
    from backend.simulation.hydrology_solver import current_water_depth
    suitability = compute_suitability_matrix(current_water_depth)

    candidates = []
    for y in range(GRID_HEIGHT):
        for x in range(GRID_WIDTH):
            score = float(suitability[y, x])
            if score >= 50.0:
                elev = float(GUWAHATI_TOPOGRAPHY_GRID[y, x])
                depth = float(current_water_depth[y, x])
                capacity = int(3500 + (elev - 50.0) * 80)
                capacity = min(7500, max(2500, capacity))

                candidates.append({
                    "grid_x": x,
                    "grid_y": y,
                    "elevation_msl": elev,
                    "water_depth_m": depth,
                    "suitability_score": score,
                    "suggested_capacity": capacity,
                    "supply_manifest": {
                        "food_ration_days": 6,
                        "potable_water_liters": int(capacity * 6.5),
                        "medical_trauma_kits": int(capacity * 0.12),
                        "rescue_boats_allocated": 6 if elev < 55 else 3,
                        "emergency_generators": 4,
                        "sanitation_units": int(capacity * 0.008),
                    }
                })

    candidates.sort(key=lambda c: c["suitability_score"], reverse=True)
    return candidates[:top_n]
