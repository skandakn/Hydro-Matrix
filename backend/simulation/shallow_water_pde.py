"""
HYDRO MATRIX : 2D MacCormack Predictor-Corrector Shallow Water PDE Solver
High-order numerical scheme for overland hydrodynamic shock capturing.

Governing Equations:
∂U/∂t + ∂E/∂x + ∂G/∂y = S
Where U = [h, uh, vh]^T
E = [uh, u^2 h + 0.5 g h^2, uvh]^T
G = [vh, uvh, v^2 h + 0.5 g h^2]^T
S = [R - I - D, -g h ∂Z/∂x - g n^2 u sqrt(u^2 + v^2) / h^(1/3), -g h ∂Z/∂y - g n^2 v sqrt(u^2 + v^2) / h^(1/3)]^T
"""

import numpy as np
from typing import Tuple, Dict, Any

GRAVITY = 9.81
MIN_WATER_DEPTH = 1e-4


class MacCormackShallowWaterSolver:
    """
    Second-order accurate explicit finite-difference PDE solver
    implementing the 2D Saint-Venant shallow water equations with shock capturing.
    """

    def __init__(self, nx: int = 18, ny: int = 18, dx: float = 250.0, dy: float = 250.0):
        self.nx = nx
        self.ny = ny
        self.dx = dx
        self.dy = dy

        # State vectors: h (depth), uh (unit discharge x), vh (unit discharge y)
        self.h = np.zeros((ny, nx), dtype=np.float64)
        self.uh = np.zeros((ny, nx), dtype=np.float64)
        self.vh = np.zeros((ny, nx), dtype=np.float64)

        # Bed elevation matrix Z
        self.Z = np.zeros((ny, nx), dtype=np.float64)

        # Manning roughness matrix
        self.n_manning = np.full((ny, nx), 0.035, dtype=np.float64)

    def set_bathymetry(self, bed_elevation: np.ndarray, roughness: np.ndarray = None):
        """Sets the digital elevation model and spatial roughness."""
        self.Z = bed_elevation.copy()
        if roughness is not None:
            self.n_manning = roughness.copy()

    def compute_flux_tensors(
        self,
        h: np.ndarray,
        uh: np.ndarray,
        vh: np.ndarray
    ) -> Tuple[Tuple[np.ndarray, np.ndarray, np.ndarray], Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """
        Computes spatial flux vectors E(U) and G(U).
        """
        # Velocity reconstruction with desingularization
        safe_h = np.maximum(MIN_WATER_DEPTH, h)
        u = np.where(h > MIN_WATER_DEPTH, uh / safe_h, 0.0)
        v = np.where(h > MIN_WATER_DEPTH, vh / safe_h, 0.0)

        # Hydrostatic pressure head: 0.5 * g * h^2
        hydrostatic = 0.5 * GRAVITY * (h ** 2)

        # Flux E (x-direction): [uh, u^2 h + 0.5 g h^2, uvh]
        E_mass = uh
        E_mom_x = (uh * u) + hydrostatic
        E_mom_y = uh * v

        # Flux G (y-direction): [vh, uvh, v^2 h + 0.5 g h^2]
        G_mass = vh
        G_mom_x = vh * u
        G_mom_y = (vh * v) + hydrostatic

        return (E_mass, E_mom_x, E_mom_y), (G_mass, G_mom_x, G_mom_y)

    def compute_source_terms(
        self,
        h: np.ndarray,
        uh: np.ndarray,
        vh: np.ndarray,
        rainfall_flux: np.ndarray,
        drainage_sink: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Computes bed slope gravity gradient and Manning friction source terms:
        S = [S_mass, S_mom_x, S_mom_y]
        """
        safe_h = np.maximum(MIN_WATER_DEPTH, h)
        u = np.where(h > MIN_WATER_DEPTH, uh / safe_h, 0.0)
        v = np.where(h > MIN_WATER_DEPTH, vh / safe_h, 0.0)
        velocity_mag = np.sqrt(u**2 + v**2)

        # Bed slope gradient: -g * h * ∇Z
        grad_z_y, grad_z_x = np.gradient(self.Z, self.dy, self.dx)
        bed_slope_x = -GRAVITY * h * grad_z_x
        bed_slope_y = -GRAVITY * h * grad_z_y

        # Bottom friction slope: -g * n^2 * u * |V| / h^(1/3)
        h_one_third = safe_h ** (1.0 / 3.0)
        friction_coeff = GRAVITY * (self.n_manning ** 2) * velocity_mag / np.maximum(0.01, h_one_third)
        friction_x = -friction_coeff * u * h
        friction_y = -friction_coeff * v * h

        # Net source terms
        S_mass = rainfall_flux - drainage_sink
        S_mom_x = bed_slope_x + friction_x
        S_mom_y = bed_slope_y + friction_y

        # Zero out momentum in dry cells
        dry_mask = h <= MIN_WATER_DEPTH
        S_mom_x[dry_mask] = 0.0
        S_mom_y[dry_mask] = 0.0

        return S_mass, S_mom_x, S_mom_y

    def step(
        self,
        dt: float,
        rainfall_flux: np.ndarray,
        drainage_sink: np.ndarray
    ) -> Dict[str, np.ndarray]:
        """
        Executes a two-step predictor-corrector MacCormack time update:
        Step 1 (Predictor): Forward spatial differences
        Step 2 (Corrector): Backward spatial differences
        """
        h_0, uh_0, vh_0 = self.h.copy(), self.uh.copy(), self.vh.copy()

        # ----------------------------------------------------
        # PREDICTOR STEP (Forward Differences)
        # ----------------------------------------------------
        E, G = self.compute_flux_tensors(h_0, uh_0, vh_0)
        S_mass, S_x, S_y = self.compute_source_terms(h_0, uh_0, vh_0, rainfall_flux, drainage_sink)

        # Forward difference spatial derivatives: (F_{i+1} - F_i) / dx
        dE_dx_mass = (np.roll(E[0], -1, axis=1) - E[0]) / self.dx
        dE_dx_x = (np.roll(E[1], -1, axis=1) - E[1]) / self.dx
        dE_dx_y = (np.roll(E[2], -1, axis=1) - E[2]) / self.dx

        dG_dy_mass = (np.roll(G[0], -1, axis=0) - G[0]) / self.dy
        dG_dy_x = (np.roll(G[1], -1, axis=0) - G[1]) / self.dy
        dG_dy_y = (np.roll(G[2], -1, axis=0) - G[2]) / self.dy

        # Predicted intermediate state: U* = U^n - dt (∂E/∂x + ∂G/∂y) + dt * S
        h_pred = np.maximum(0.0, h_0 - dt * (dE_dx_mass + dG_dy_mass) + dt * S_mass)
        uh_pred = uh_0 - dt * (dE_dx_x + dG_dy_x) + dt * S_x
        vh_pred = vh_0 - dt * (dE_dx_y + dG_dy_y) + dt * S_y

        # Boundary condition clamping
        h_pred[0:2, :] = np.maximum(1.15, h_pred[0:2, :])  # River boundary

        # ----------------------------------------------------
        # CORRECTOR STEP (Backward Differences)
        # ----------------------------------------------------
        E_pred, G_pred = self.compute_flux_tensors(h_pred, uh_pred, vh_pred)
        S_mass_p, S_x_p, S_y_p = self.compute_source_terms(h_pred, uh_pred, vh_pred, rainfall_flux, drainage_sink)

        # Backward difference spatial derivatives: (F_i - F_{i-1}) / dx
        dE_dx_mass_b = (E_pred[0] - np.roll(E_pred[0], 1, axis=1)) / self.dx
        dE_dx_x_b = (E_pred[1] - np.roll(E_pred[1], 1, axis=1)) / self.dx
        dE_dx_y_b = (E_pred[2] - np.roll(E_pred[2], 1, axis=1)) / self.dx

        dG_dy_mass_b = (G_pred[0] - np.roll(G_pred[0], 1, axis=0)) / self.dy
        dG_dy_x_b = (G_pred[1] - np.roll(G_pred[1], 1, axis=0)) / self.dy
        dG_dy_y_b = (G_pred[2] - np.roll(G_pred[2], 1, axis=0)) / self.dy

        # Corrector average: U^{n+1} = 0.5 * (U^n + U* - dt (∂E*/∂x + ∂G*/∂y) + dt * S*)
        h_corr = 0.5 * (h_0 + h_pred - dt * (dE_dx_mass_b + dG_dy_mass_b) + dt * S_mass_p)
        uh_corr = 0.5 * (uh_0 + uh_pred - dt * (dE_dx_x_b + dG_dy_x_b) + dt * S_x_p)
        vh_corr = 0.5 * (vh_0 + vh_pred - dt * (dE_dx_y_b + dG_dy_y_b) + dt * S_y_p)

        # Positivity preservation
        self.h = np.maximum(0.0, h_corr)
        self.h[0:2, :] = np.maximum(1.15, self.h[0:2, :])

        # Velocity damping in dry sectors
        dry = self.h <= MIN_WATER_DEPTH
        self.uh = np.where(dry, 0.0, uh_corr)
        self.vh = np.where(dry, 0.0, vh_corr)

        u_final = np.where(~dry, self.uh / np.maximum(MIN_WATER_DEPTH, self.h), 0.0)
        v_final = np.where(~dry, self.vh / np.maximum(MIN_WATER_DEPTH, self.h), 0.0)
        speed = np.sqrt(u_final**2 + v_final**2)

        return {
            "water_depth": self.h,
            "velocity_u": u_final,
            "velocity_v": v_final,
            "speed": speed,
            "discharge_x": self.uh,
            "discharge_y": self.vh,
        }
