"""
HYDRO MATRIX : 2D Saint-Venant Diffusive Wave Hydrology Solver (NumPy)
Core overland flow, precipitation, mechanical extraction, and boundary coupling.
"""

import numpy as np
from typing import Dict, Any, Tuple
from backend.simulation.city_grid import (
    GRID_WIDTH,
    GRID_HEIGHT,
    CELL_SIZE_METERS,
    CELL_AREA_SQ_METERS,
    GUWAHATI_TOPOGRAPHY_GRID,
)
from backend.simulation.manning_friction import ManningFrictionEngine
from backend.simulation.cfl_limiter import CFLLimiterEngine

# Module singletons
manning_engine = ManningFrictionEngine(GRID_HEIGHT, GRID_WIDTH, CELL_SIZE_METERS)
cfl_engine = CFLLimiterEngine(CELL_SIZE_METERS, courant_max=0.35)

# Persistent simulation state
current_water_depth = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=np.float64)
current_water_depth[0:2, :] = 1.25  # Brahmaputra base river stage
barrier_height_matrix = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=np.float64)

# Channel mask indexing
channel_mask = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=bool)
channel_mask[2:10, 8] = True   # Bharalu Spine
channel_mask[8:13, 9] = True   # Bahini River
channel_mask[12:16, 12] = True # Basistha Confluence
channel_mask[6:10, 6] = True   # Mora Bharalu
channel_mask[2:5, 4] = True    # Lakhimijan Canal


def compute_orographic_precipitation_tensor(base_rainfall_mm_hr: float) -> np.ndarray:
    """
    Computes altitude-dependent rainfall intensity over Guwahati basin:
    R(x, y) = R_0 * Ω(Z)
    """
    prec_factor = 0.0020
    omega = np.ones((GRID_HEIGHT, GRID_WIDTH), dtype=np.float64)
    omega[GUWAHATI_TOPOGRAPHY_GRID > 55.0] = 1.15
    omega[GUWAHATI_TOPOGRAPHY_GRID > 70.0] = 1.30

    R = base_rainfall_mm_hr * prec_factor * omega
    R[0:2, :] = 0.0  # Receiving river channel
    return R


def execute_vectorized_step(
    rainfall_mm_hr: float,
    active_pumps: int = 20,
    sluice_open: bool = True,
    efficiency: float = 1.0,
    crit_threshold: float = 0.75,
    warn_threshold: float = 0.25,
) -> Dict[str, Any]:
    """
    Performs one discrete Navier-Stokes / Diffusive Wave overland step.
    Returns full telemetry dictionary.
    """
    global current_water_depth

    # 1. Atmospheric precipitation influx
    inflow_rain = compute_orographic_precipitation_tensor(rainfall_mm_hr)

    # 2. Drainage & Infiltration Sink
    if sluice_open:
        conveyance = np.where(channel_mask, 0.070, 0.020)
        river_outflow = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=np.float64)
        river_outflow[2, 5] = 0.090  # Bharalumukh outfall
        river_outflow[4, 2] = 0.090  # Lakhimijan outfall
        D_nat = (conveyance + river_outflow + 0.0025) * efficiency
    else:
        conveyance = np.where(channel_mask, 0.008, 0.002)
        river_outflow = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=np.float64)
        D_nat = (conveyance + river_outflow + 0.0006) * efficiency

    # 3. GMDA 20-Pump Priority Extraction
    pump_scale = np.clip(active_pumps / 20.0, 0.0, 1.0)
    pump_base = pump_scale * 0.35
    W_pumps = np.full((GRID_HEIGHT, GRID_WIDTH), 0.70, dtype=np.float64)
    W_pumps[GUWAHATI_TOPOGRAPHY_GRID <= 53.5] = 1.00
    W_pumps[channel_mask] = 1.40
    # Spot bowls: Anil, Nabin, Rukminigaon, Tarun Nagar
    W_pumps[5, 8] = 1.75
    W_pumps[6, 8] = 1.75
    W_pumps[8, 11] = 1.75
    W_pumps[6, 7] = 1.75

    D_pumps = pump_base * W_pumps * efficiency
    D_total = D_nat + D_pumps

    prev_depth = current_water_depth.copy()
    current_water_depth = np.maximum(0.0, current_water_depth + (inflow_rain - D_total))
    current_water_depth[0:2, :] = np.maximum(1.15, current_water_depth[0:2, :])

    # 4. Total Hydraulic Head Matrix: Φ = Z + H + B
    total_head = GUWAHATI_TOPOGRAPHY_GRID + current_water_depth + barrier_height_matrix

    # 5. Stencil flux calculation
    phi_n = np.roll(total_head, shift=1, axis=0)
    phi_s = np.roll(total_head, shift=-1, axis=0)
    phi_w = np.roll(total_head, shift=1, axis=1)
    phi_e = np.roll(total_head, shift=-1, axis=1)

    dphi_n = np.maximum(0.0, total_head - phi_n)
    dphi_s = np.maximum(0.0, total_head - phi_s)
    dphi_w = np.maximum(0.0, total_head - phi_w)
    dphi_e = np.maximum(0.0, total_head - phi_e)

    if not sluice_open:
        dphi_n[2, :] = 0.0  # Cut hydraulic gradient to Brahmaputra river

    sum_grad = dphi_n + dphi_s + dphi_w + dphi_e
    active_flux_mask = sum_grad > 0.002

    alpha = 0.20
    raw_qn = np.where(active_flux_mask, dphi_n * alpha, 0.0)
    raw_qs = np.where(active_flux_mask, dphi_s * alpha, 0.0)
    raw_qw = np.where(active_flux_mask, dphi_w * alpha, 0.0)
    raw_qe = np.where(active_flux_mask, dphi_e * alpha, 0.0)

    # Apply CFL flux limiter
    qn, qs, qw, qe = cfl_engine.apply_outbound_flux_limiter(
        current_water_depth, raw_qn, raw_qs, raw_qw, raw_qe
    )

    inflow_n = np.roll(qs, shift=1, axis=0)
    inflow_s = np.roll(qn, shift=-1, axis=0)
    inflow_w = np.roll(qe, shift=1, axis=1)
    inflow_e = np.roll(qw, shift=-1, axis=1)

    delta_h = (inflow_n + inflow_s + inflow_w + inflow_e) - (qn + qs + qw + qe)
    current_water_depth = np.maximum(0.0, current_water_depth + delta_h)
    current_water_depth[0:2, :] = np.maximum(1.15, current_water_depth[0:2, :])

    # 6. Directional Velocity and Speed
    u, v, speed = manning_engine.compute_velocity_field(total_head, current_water_depth)

    # 7. Summary metrics
    terrestrial = np.ones((GRID_HEIGHT, GRID_WIDTH), dtype=bool)
    terrestrial[0:2, :] = False

    flooded_cells = int(np.sum((current_water_depth > 0.10) & terrestrial))
    flooded_sqkm = float(flooded_cells * (CELL_AREA_SQ_METERS / 1_000_000.0))

    crit_count = int(np.sum((current_water_depth >= crit_threshold) & terrestrial))
    warn_count = int(np.sum((current_water_depth >= warn_threshold) & (current_water_depth < crit_threshold) & terrestrial))

    weighted_score = (crit_count * 1.0) + (warn_count * 0.6) + max(0, flooded_cells - crit_count - warn_count) * 0.25
    affected_pop = int(min(1_500_000, np.round((weighted_score / 288.0) * 1_050_000)))

    discharge_m3s = float(
        np.clip(24.0 + (rainfall_mm_hr * 0.3) if sluice_open else (active_pumps * 1.8), 0.0, 85.0)
    )

    return {
        "flooded_cells": flooded_cells,
        "flooded_area_sqkm": round(flooded_sqkm, 2),
        "critical_zones": crit_count,
        "warning_zones": warn_count,
        "max_water_depth_m": round(float(np.max(current_water_depth[terrestrial])), 2),
        "max_velocity_mps": round(float(np.max(speed)), 2),
        "affected_population": affected_pop,
        "bahini_bharalu_discharge_m3s": round(discharge_m3s, 1),
        "depth_matrix": current_water_depth.tolist(),
    }
