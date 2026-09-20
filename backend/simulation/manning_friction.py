"""
HYDRO MATRIX : 2D Manning Friction & Overland Open-Channel Momentum Engine
Vectorized momentum dissipation and directional friction slope calculations.
"""

import numpy as np
from typing import Tuple

# Roughness coefficients (Manning's n)
N_ENGINEERED_CANAL = 0.025   # Lined masonry drainage channels (Bharalu, Bahini)
N_NATURAL_STREAM = 0.035      # Natural boulder stream (Basistha)
N_URBAN_RESIDENTIAL = 0.050   # Densely built urban bowls (Anil Nagar, Nabin Nagar)
N_WETLAND_MARSH = 0.045       # Wetland vegetation (Deepor Beel)
N_STEEP_SLOPE = 0.060         # Forested hillside runoff (Khasi Foothills)


class ManningFrictionEngine:
    """
    Computes spatially heterogeneous hydraulic friction and 2D velocity fields
    governed by the Manning-Strickler formula.
    """

    def __init__(self, grid_h: int = 18, grid_w: int = 18, cell_size_m: float = 250.0):
        self.H = grid_h
        self.W = grid_w
        self.dx = cell_size_m
        self.dy = cell_size_m

        # Initialize Manning roughness matrix N(x, y)
        self.N_matrix = np.full((self.H, self.W), N_URBAN_RESIDENTIAL, dtype=np.float64)

        # Apply specific channel roughness
        self._initialize_roughness_zones()

    def _initialize_roughness_zones(self):
        # Northern receiving Brahmaputra river channel
        self.N_matrix[0:2, :] = 0.030

        # Bharalu & Bahini urban masonry canals
        self.N_matrix[2:10, 8] = N_ENGINEERED_CANAL
        self.N_matrix[8:13, 9] = N_ENGINEERED_CANAL

        # Basistha natural mountain stream
        self.N_matrix[12:16, 12] = N_NATURAL_STREAM

        # Deepor Beel wetland corridor
        self.N_matrix[13:16, 4:6] = N_WETLAND_MARSH

        # Southern Khasi foothills escarpment
        self.N_matrix[16:18, :] = N_STEEP_SLOPE

    def compute_hydraulic_radius(self, water_depth: np.ndarray) -> np.ndarray:
        """
        Approximates the hydraulic radius Rh for shallow overland flow.
        For sheet flow across wide 250m cells, Rh ≈ h (water depth).
        """
        return np.maximum(0.001, water_depth)

    def compute_velocity_field(
        self,
        total_head: np.ndarray,
        water_depth: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculates directional velocity components u, v and total flow speed
        using 2D central finite differences on the total hydraulic head Φ:

        u = (1/n) * Rh^(2/3) * |Sf_x|^(1/2) * sgn(-∂Φ/∂x)
        v = (1/n) * Rh^(2/3) * |Sf_y|^(1/2) * sgn(-∂Φ/∂y)
        """
        # Central difference gradients: ∂Φ/∂x and ∂Φ/∂y
        grad_y, grad_x = np.gradient(total_head, self.dy, self.dx)

        # Friction slope magnitude: Sf = -∇Φ
        slope_x = -grad_x
        slope_y = -grad_y
        slope_magnitude = np.sqrt(slope_x**2 + slope_y**2)

        # Hydraulic radius Rh
        Rh = self.compute_hydraulic_radius(water_depth)
        Rh_term = Rh ** (2.0 / 3.0)

        # Directional velocities
        sign_x = np.sign(slope_x)
        sign_y = np.sign(slope_y)

        u = (1.0 / self.N_matrix) * Rh_term * np.sqrt(np.abs(slope_x)) * sign_x
        v = (1.0 / self.N_matrix) * Rh_term * np.sqrt(np.abs(slope_y)) * sign_y

        # Bound realistic overland velocities (< 4.5 m/s)
        u = np.clip(u, -4.5, 4.5)
        v = np.clip(v, -4.5, 4.5)
        speed = np.sqrt(u**2 + v**2)

        # Zero out dry sectors
        dry_mask = water_depth <= 0.002
        u[dry_mask] = 0.0
        v[dry_mask] = 0.0
        speed[dry_mask] = 0.0

        return u, v, speed

    def compute_shear_stress(
        self,
        water_depth: np.ndarray,
        friction_slope: np.ndarray,
        water_density_kg_m3: float = 1000.0,
        gravity_mps2: float = 9.81
    ) -> np.ndarray:
        """
        Computes bed boundary shear stress: τ_0 = ρ * g * Rh * Sf
        Used for sediment transport and silt scour calculations.
        """
        Rh = self.compute_hydraulic_radius(water_depth)
        tau_0 = water_density_kg_m3 * gravity_mps2 * Rh * friction_slope
        return tau_0
