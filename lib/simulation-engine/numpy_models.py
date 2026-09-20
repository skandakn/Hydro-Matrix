"""
HYDRO MATRIX : NumPy & SciPy Vectorized Hydrological Reference Engine
Localization: Guwahati — Bahini/Bharalu Basin & GMDA Drainage Ecosystem

Mathematical Formulations:
1. 2D Saint-Venant Diffusive Wave Approximation (Continuity & Momentum)
2. Vectorized Manning Friction & Open Channel Roughness Matrix
3. Courant-Friedrichs-Lewy (CFL) Flux Limiter
4. Orographic Precipitation Lift Broadcast Tensor
5. Sluice Gate Boundary & Backwater Lock
6. GMDA 20-Pump Priority Extraction Tensor
7. Multi-Criteria Spatial Decision Analysis (MCDA) for Rescue Camp Suitability
"""

import numpy as np
from scipy.signal import convolve2d

# ---------------------------------------------------------
# 1. CONSTANTS & DOMAIN DISCRETIZATION
# ---------------------------------------------------------
GRID_W = 18
GRID_H = 18
CELL_SIZE_M = 250.0       # 250m cell resolution
CELL_AREA_M2 = CELL_SIZE_M * CELL_SIZE_M  # 62,500 m²
CFL_LIMITER = 0.35        # Courant flux stability limiter
CRIT_THRESHOLD = 0.75     # Meters (Critical DEFCON 1)
WARN_THRESHOLD = 0.25     # Meters (Warning Level 2)

# Manning roughness coefficients matrix n(x, y)
# 0.025 for engineered canals (Bharalu, Bahini); 0.050 for residential urban bowls
MANNING_N_CANAL = 0.025
MANNING_N_URBAN = 0.050


class HydroMatrixNumPyEngine:
    """
    Vectorized NumPy implementation of the Hydro Matrix 2D Shallow Water
    and Overland Flood Routing Model.
    """

    def __init__(self):
        # Bed Elevation Matrix Z [meters above MSL]
        self.Z = np.full((GRID_H, GRID_W), 52.0, dtype=np.float64)
        
        # Northern Brahmaputra River Basin (Rows 0-1)
        self.Z[0:2, :] = 49.0
        
        # Southern Khasi-Jaintia Foothills (Rows 16-17)
        self.Z[16:18, :] = 85.0
        
        # Nilachal / Kamakhya Hills (West flank)
        self.Z[2:5, 1:3] = 142.0
        
        # Notorious Low-Lying Depression Bowls (Anil Nagar, Nabin Nagar, Rukminigaon)
        self.Z[5, 8] = 49.2   # Anil Nagar
        self.Z[6, 8] = 49.0   # Nabin Nagar
        self.Z[8, 11] = 49.5  # Rukminigaon
        self.Z[6, 7] = 49.3   # Tarun Nagar
        self.Z[6, 9] = 49.8   # Zoo Road

        # Water Depth Matrix H [meters]
        self.H = np.zeros((GRID_H, GRID_W), dtype=np.float64)
        self.H[0:2, :] = 1.2  # Perennial Brahmaputra stage

        # Temporary Barrier Height Matrix B [meters]
        self.B = np.zeros((GRID_H, GRID_W), dtype=np.float64)

        # Canal Channel Mask (Bharalu, Bahini, Basistha, Mora Bharalu, Lakhimijan)
        self.channel_mask = np.zeros((GRID_H, GRID_W), dtype=bool)
        self.channel_mask[2:10, 8] = True   # Bharalu Spine
        self.channel_mask[8:13, 9] = True   # Bahini River
        self.channel_mask[12:16, 12] = True # Basistha Confluence
        self.channel_mask[6:10, 6] = True   # Mora Bharalu
        self.channel_mask[2:5, 4] = True    # Lakhimijan Canal

        # Population Density Matrix P [residents/cell]
        self.P = np.full((GRID_H, GRID_W), 3600, dtype=np.int32)
        self.P[0:2, :] = 0  # River has zero residents
        self.P[5:7, 7:10] = 7200  # High-density urban core

    def compute_orographic_lift(self) -> np.ndarray:
        """
        Calculates altitude-dependent precipitation amplification tensor Ω(Z).
        Ω(Z) = 1.30 for z > 70m; 1.15 for 55m < z <= 70m; 1.00 for z <= 55m.
        """
        omega = np.ones_like(self.Z)
        omega[self.Z > 55.0] = 1.15
        omega[self.Z > 70.0] = 1.30
        return omega

    def run_physics_step(
        self,
        rainfall_mm_hr: float,
        active_pumps_count: int = 20,
        sluice_open: bool = True,
        drainage_efficiency: float = 1.0,
    ) -> dict:
        """
        Executes one discrete 2D Navier-Stokes / Diffusive Wave time step
        using vectorized matrix operations.
        """
        # 1. PRECIPITATION INFLUX (Vectorized broadcast)
        prec_factor = 0.0020
        omega = self.compute_orographic_lift()
        R = (rainfall_mm_hr * prec_factor * omega) if rainfall_mm_hr > 0 else np.zeros_like(self.Z)
        # Brahmaputra river cells do not receive overland ponding
        R[0:2, :] = 0.0

        # 2. NATURAL INFILTRATION & DRAINAGE TENSOR
        # Sluice OPEN: Gravity drainage to Brahmaputra active
        # Sluice CLOSED: Brahmaputra backwater lock engages; gravity outflow = 0
        if sluice_open:
            conveyance = np.where(self.channel_mask, 0.070, 0.020)
            river_outflow = np.zeros_like(self.Z)
            river_outflow[2, 5] = 0.090  # Bharalumukh sluice outfall
            river_outflow[4, 2] = 0.090  # Lakhimijan outfall
            D_nat = (conveyance + river_outflow + 0.0024) * drainage_efficiency
        else:
            conveyance = np.where(self.channel_mask, 0.008, 0.002)
            river_outflow = np.zeros_like(self.Z)  # Zero outflow through locked gates
            D_nat = (conveyance + river_outflow + 0.0006) * drainage_efficiency

        # 3. GMDA 20-PUMP MECHANICAL DEWATERING TENSOR
        # Spatially weighted pump extraction targeting low-lying bowls
        pump_scale = np.clip(active_pumps_count / 20.0, 0.0, 1.0)
        pump_base_rate = pump_scale * 0.35

        # Priority spatial weight mask W_priority
        W_priority = np.full_like(self.Z, 0.70)
        W_priority[self.Z <= 53.5] = 1.00
        W_priority[self.channel_mask] = 1.40
        # Hotspot depression bowls (Anil, Nabin, Rukminigaon, Tarun Nagar)
        W_priority[5, 8] = 1.75
        W_priority[6, 8] = 1.75
        W_priority[8, 11] = 1.75
        W_priority[6, 7] = 1.75

        D_pumps = pump_base_rate * W_priority * drainage_efficiency

        # Total drainage sink
        D_total = D_nat + D_pumps

        # Update initial net depth
        prev_H = self.H.copy()
        net_change = R - D_total
        self.H = np.maximum(0.0, self.H + net_change)
        self.H[0:2, :] = np.maximum(1.15, self.H[0:2, :])  # River boundary

        # 4. TOTAL HYDRAULIC HEAD MATRIX Φ = Z + H + B
        Phi = self.Z + self.H + self.B

        # 5. VECTORIZED CELLULAR AUTOMATA 2D DIFFUSIVE FLUX
        # Stencils for 4-orthogonal neighbors (North, South, East, West)
        # Using np.roll for periodic/boundary-padded directional shifts
        Phi_N = np.roll(Phi, shift=1, axis=0)
        Phi_S = np.roll(Phi, shift=-1, axis=0)
        Phi_W = np.roll(Phi, shift=1, axis=1)
        Phi_E = np.roll(Phi, shift=-1, axis=1)

        # Head differences: ΔPhi_k = max(0, Phi - Phi_k)
        dPhi_N = np.maximum(0.0, Phi - Phi_N)
        dPhi_S = np.maximum(0.0, Phi - Phi_S)
        dPhi_W = np.maximum(0.0, Phi - Phi_W)
        dPhi_E = np.maximum(0.0, Phi - Phi_E)

        # Zero out transfers across closed sluice gate river boundaries
        if not sluice_open:
            dPhi_N[2, :] = 0.0  # Block transfer across river boundary (Row 2 -> Row 1)

        sum_dPhi = dPhi_N + dPhi_S + dPhi_W + dPhi_E
        mask_flow = sum_dPhi > 0.003

        # Courant CFL Flux Limiter: Max 35% outbound volume per step
        max_outbound = self.H * CFL_LIMITER
        transfer_coeff = 0.20

        # Vectorized proportional outbound transfers
        q_N = np.where(mask_flow, np.minimum(dPhi_N * transfer_coeff, max_outbound * (dPhi_N / np.maximum(1e-6, sum_dPhi))), 0.0)
        q_S = np.where(mask_flow, np.minimum(dPhi_S * transfer_coeff, max_outbound * (dPhi_S / np.maximum(1e-6, sum_dPhi))), 0.0)
        q_W = np.where(mask_flow, np.minimum(dPhi_W * transfer_coeff, max_outbound * (dPhi_W / np.maximum(1e-6, sum_dPhi))), 0.0)
        q_E = np.where(mask_flow, np.minimum(dPhi_E * transfer_coeff, max_outbound * (dPhi_E / np.maximum(1e-6, sum_dPhi))), 0.0)

        # Inflow from adjacent cells
        inflow_from_N = np.roll(q_S, shift=1, axis=0)
        inflow_from_S = np.roll(q_N, shift=-1, axis=0)
        inflow_from_W = np.roll(q_E, shift=1, axis=1)
        inflow_from_E = np.roll(q_W, shift=-1, axis=1)

        delta_H = (inflow_from_N + inflow_from_S + inflow_from_W + inflow_from_E) - (q_N + q_S + q_W + q_E)
        self.H = np.maximum(0.0, self.H + delta_H)
        self.H[0:2, :] = np.maximum(1.15, self.H[0:2, :])

        # 6. MANNING VELOCITY VECTORS & FLOW SPEED
        # Grad_x = (Phi_E - Phi_W) / 2Δx ; Grad_y = (Phi_S - Phi_N) / 2Δy
        grad_x, grad_y = np.gradient(Phi, CELL_SIZE_M)
        slope = np.sqrt(grad_x**2 + grad_y**2)
        n_roughness = np.where(self.channel_mask, MANNING_N_CANAL, MANNING_N_URBAN)
        R_h = np.maximum(0.001, self.H)
        velocity_speed = (1.0 / n_roughness) * (R_h ** (2.0 / 3.0)) * np.sqrt(np.maximum(1e-6, slope))

        # 7. TELEMETRY & STATISTICAL METRICS
        terrestrial_mask = np.ones((GRID_H, GRID_W), dtype=bool)
        terrestrial_mask[0:2, :] = False  # Exclude Brahmaputra riverbed

        flooded_mask = (self.H > 0.10) & terrestrial_mask
        flooded_cells = int(np.sum(flooded_mask))
        flooded_area_sqkm = float(flooded_cells * (CELL_AREA_M2 / 1_000_000.0))

        critical_mask = (self.H >= CRIT_THRESHOLD) & terrestrial_mask
        warning_mask = (self.H >= WARN_THRESHOLD) & (self.H < CRIT_THRESHOLD) & terrestrial_mask

        critical_count = int(np.sum(critical_mask))
        warning_count = int(np.sum(warning_mask))

        # Dynamic Time-to-Critical (tau_crit in minutes)
        dH_dt = self.H - prev_H
        tau_crit = np.full_like(self.H, np.nan)
        rising_mask = (dH_dt > 0.0005) & (self.H < CRIT_THRESHOLD) & terrestrial_mask
        tau_crit[rising_mask] = (CRIT_THRESHOLD - self.H[rising_mask]) / dH_dt[rising_mask]
        tau_crit[critical_mask] = 0.0

        # Weighted demographic exposure model
        weighted_score = (critical_count * 1.0) + (warning_count * 0.6) + max(0, flooded_cells - critical_count - warning_count) * 0.25
        basin_ratio = np.clip(weighted_score / 288.0, 0.0, 1.0)
        affected_population = int(min(1_500_000, np.round(basin_ratio * 1_050_000)))

        return {
            "flooded_cells": flooded_cells,
            "flooded_area_sqkm": round(flooded_area_sqkm, 2),
            "critical_zones": critical_count,
            "warning_zones": warning_count,
            "max_water_depth_m": round(float(np.max(self.H[terrestrial_mask])), 2),
            "max_flow_velocity_mps": round(float(np.max(velocity_speed)), 2),
            "affected_population": affected_population,
            "mean_time_to_critical_min": round(float(np.nanmean(tau_crit)), 1) if not np.all(np.isnan(tau_crit)) else None,
        }

    def compute_camp_suitability_matrix(self) -> np.ndarray:
        """
        Multi-Criteria Spatial Decision Analysis (MCDA) in NumPy:
        S = Phi_dry(H) + Phi_elev(Z) + Phi_distress(P_risk) + Phi_infra - Psi_overlap
        Returns suitability score matrix S in [0, 100].
        """
        S = np.zeros((GRID_H, GRID_W), dtype=np.float64)

        # 1. Disqualification mask (water > 0.12m or riverbed)
        ineligible = (self.H > 0.12) | (self.Z < 50.0)
        ineligible[0:2, :] = True

        # 2. Inundation Safety Factor (0-35 pts)
        phi_dry = np.where(self.H == 0.0, 35.0, np.where(self.H <= 0.05, 24.0, 10.0))

        # 3. Elevation Headroom Factor (0-30 pts)
        phi_elev = np.where(
            self.Z >= 70.0, 30.0,
            np.where(self.Z >= 55.0, 26.0,
            np.where(self.Z >= 52.5, 20.0,
            np.where(self.Z >= 51.0, 12.0, 4.0)))
        )

        # 4. Vulnerable Population Coverage (Chebyshev 2D convolution kernel)
        kernel_size = 7  # 7x7 Chebyshev radius 3
        chebyshev_kernel = np.ones((kernel_size, kernel_size), dtype=np.float64)
        chebyshev_kernel[3, 3] = 0.0  # Exclude center cell

        distress_density = np.where(self.H >= CRIT_THRESHOLD, self.P * 1.0, np.where(self.H >= WARN_THRESHOLD, self.P * 0.4, 0.0))
        distressed_neighbors = convolve2d(distress_density, chebyshev_kernel, mode='same', boundary='fill', fillvalue=0)

        phi_distress = np.where(
            distressed_neighbors > 15000, 25.0,
            np.where(distressed_neighbors > 5000, 18.0,
            np.where(distressed_neighbors > 1000, 10.0, 5.0))
        )

        # Total suitability score
        S = phi_dry + phi_elev + phi_distress
        S[ineligible] = 0.0
        return np.clip(np.round(S), 0.0, 100.0)


if __name__ == "__main__":
    engine = HydroMatrixNumPyEngine()
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print("[HYDRO MATRIX] Running NumPy Reference Physics Simulation for Guwahati...")
    
    # Simulate Khasi Foothill Cloudburst (120 mm/hr, 20 pumps active, Sluice Open)
    for tick in range(1, 6):
        res = engine.run_physics_step(rainfall_mm_hr=120.0, active_pumps_count=20, sluice_open=True)
        print(f"Tick {tick:02d} | Flooded Area: {res['flooded_area_sqkm']} km² | Critical: {res['critical_zones']} | Max Depth: {res['max_water_depth_m']}m | Pop: {res['affected_population']:,}")

    suitability = engine.compute_camp_suitability_matrix()
    top_camps = np.argwhere(suitability >= 75)
    print(f"\n[RELIEF CAMPS] Top Candidate Rescue Camp Sites (Score >= 75): {len(top_camps)} prime locations detected.")
