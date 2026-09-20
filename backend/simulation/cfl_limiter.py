"""
HYDRO MATRIX : Courant-Friedrichs-Lewy (CFL) Stability & Adaptive Time-Stepping
Enforces hyperbolic PDE numerical stability bounds for 2D overland flow.
"""

import numpy as np
from typing import Tuple

GRAVITY = 9.81  # m/s²
DEFAULT_COURANT_NUMBER = 0.35  # Maximum CFL safety factor for diffusive wave scheme


class CFLLimiterEngine:
    """
    Manages numerical stability bounds and adaptive time-step sizing
    for the 2D Saint-Venant hydraulic routing engine.
    """

    def __init__(self, cell_size_m: float = 250.0, courant_max: float = DEFAULT_COURANT_NUMBER):
        self.dx = cell_size_m
        self.courant_max = courant_max

    def compute_max_advective_celerity(
        self,
        velocity_u: np.ndarray,
        velocity_v: np.ndarray,
        water_depth: np.ndarray
    ) -> float:
        """
        Calculates maximum wave celerity: c_max = max(|u| + sqrt(g * h))
        representing the fastest characteristic speed of gravity water waves.
        """
        wave_celerity = np.sqrt(np.maximum(0.0, GRAVITY * water_depth))
        total_celerity = np.sqrt(velocity_u**2 + velocity_v**2) + wave_celerity
        return float(np.max(total_celerity))

    def compute_adaptive_timestep(
        self,
        velocity_u: np.ndarray,
        velocity_v: np.ndarray,
        water_depth: np.ndarray,
        max_dt_seconds: float = 60.0,
        min_dt_seconds: float = 1.0
    ) -> float:
        """
        Determines the maximum permissible stable time-step:
        Δt <= C_max * (Δx / c_max)
        """
        max_c = self.compute_max_advective_celerity(velocity_u, velocity_v, water_depth)
        if max_c <= 1e-4:
            return max_dt_seconds

        dt_cfl = self.courant_max * (self.dx / max_c)
        return float(np.clip(dt_cfl, min_dt_seconds, max_dt_seconds))

    def apply_outbound_flux_limiter(
        self,
        water_depth: np.ndarray,
        flux_north: np.ndarray,
        flux_south: np.ndarray,
        flux_west: np.ndarray,
        flux_east: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Ensures that outbound volumetric flux across all 4 orthogonal faces
        never exceeds the available physical water depth in the cell:
        sum(Q_out) <= 0.35 * h_cell
        """
        sum_outbound = flux_north + flux_south + flux_west + flux_east
        max_allowed_outbound = water_depth * self.courant_max

        # Scaling ratio when outbound flux attempts to exceed available mass
        overshoot_mask = sum_outbound > max_allowed_outbound
        scaling_ratio = np.ones_like(water_depth)
        scaling_ratio[overshoot_mask] = (
            max_allowed_outbound[overshoot_mask] / np.maximum(1e-6, sum_outbound[overshoot_mask])
        )

        limited_n = flux_north * scaling_ratio
        limited_s = flux_south * scaling_ratio
        limited_w = flux_west * scaling_ratio
        limited_e = flux_east * scaling_ratio

        return limited_n, limited_s, limited_w, limited_e
