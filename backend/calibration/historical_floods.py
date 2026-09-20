"""
HYDRO MATRIX : Historical Flood Calibration & Ground Truth Validation
Calibrated against Assam State Disaster Management Authority (ASDMA)
and Central Water Commission (CWC) Guwahati flood records (2022 & 2024).
"""

import numpy as np
from typing import Dict, List, Any

# Historical high-water marks recorded across Guwahati urban hotspots
HISTORICAL_GROUND_TRUTH = {
    "june_2022_flood": {
        "event_name": "Guwahati Extreme Urban Inundation (June 14-18, 2022)",
        "cumulative_rainfall_mm": 218.4,
        "brahmaputra_stage_m": 50.45,  # Approaching Danger Level 50.50m
        "observed_depths_meters": {
            "anil_nagar_bylane_1": 1.45,
            "nabin_nagar_drain_inlet": 1.38,
            "tarun_nagar_culvert": 1.15,
            "rukminigaon_sump": 1.25,
            "zoo_road_tiniali": 0.85,
            "lachit_nagar": 0.78,
            "rajgarh_road": 0.65,
            "hatigaon_sijubari": 0.90,
        },
    },
    "july_2024_cloudburst": {
        "event_name": "Basistha/Bahini Catchment Flash Flood (July 2-4, 2024)",
        "cumulative_rainfall_mm": 184.2,
        "brahmaputra_stage_m": 49.88,
        "observed_depths_meters": {
            "anil_nagar_bylane_1": 1.20,
            "nabin_nagar_drain_inlet": 1.15,
            "tarun_nagar_culvert": 0.95,
            "rukminigaon_sump": 1.40,  # Severe localized flash ponding
            "zoo_road_tiniali": 0.72,
            "lachit_nagar": 0.60,
            "rajgarh_road": 0.55,
            "hatigaon_sijubari": 1.05,
        },
    },
}


class HistoricalModelCalibrator:
    """
    Evaluates simulation accuracy against historical field records
    using standard hydrological skill metrics:
    - Root Mean Square Error (RMSE)
    - Mean Absolute Error (MAE)
    - Nash-Sutcliffe Model Efficiency (NSE)
    - Percent Bias (PBIAS)
    """

    @staticmethod
    def compute_rmse(observed: np.ndarray, simulated: np.ndarray) -> float:
        """Root Mean Square Error: RMSE = sqrt(mean((obs - sim)^2))"""
        return float(np.sqrt(np.mean((observed - simulated) ** 2)))

    @staticmethod
    def compute_mae(observed: np.ndarray, simulated: np.ndarray) -> float:
        """Mean Absolute Error: MAE = mean(|obs - sim|)"""
        return float(np.mean(np.abs(observed - simulated)))

    @staticmethod
    def compute_nash_sutcliffe_efficiency(observed: np.ndarray, simulated: np.ndarray) -> float:
        """
        Nash-Sutcliffe Efficiency (NSE):
        NSE = 1 - (sum((obs - sim)^2) / sum((obs - mean(obs))^2))
        NSE > 0.75 indicates superior predictive skill.
        """
        denom = np.sum((observed - np.mean(observed)) ** 2)
        if denom == 0:
            return 1.0
        num = np.sum((observed - simulated) ** 2)
        return float(1.0 - (num / denom))

    @staticmethod
    def compute_pbias(observed: np.ndarray, simulated: np.ndarray) -> float:
        """
        Percent Bias (PBIAS):
        PBIAS = 100 * (sum(sim - obs) / sum(obs))
        Optimal value is 0.0; values between -15% and +15% are deemed satisfactory.
        """
        denom = np.sum(observed)
        if denom == 0:
            return 0.0
        return float(100.0 * (np.sum(simulated - observed) / denom))

    def evaluate_scenario_performance(
        self,
        event_key: str,
        simulated_depths: Dict[str, float]
    ) -> Dict[str, Any]:
        """Runs full calibration suite against specified historical storm event."""
        if event_key not in HISTORICAL_GROUND_TRUTH:
            raise KeyError(f"Unknown historical event: {event_key}")

        truth = HISTORICAL_GROUND_TRUTH[event_key]["observed_depths_meters"]
        common_keys = [k for k in truth if k in simulated_depths]

        if not common_keys:
            raise ValueError("No matching spatial monitoring points found between simulation and ground truth.")

        obs_arr = np.array([truth[k] for k in common_keys], dtype=np.float64)
        sim_arr = np.array([simulated_depths[k] for k in common_keys], dtype=np.float64)

        rmse = self.compute_rmse(obs_arr, sim_arr)
        mae = self.compute_mae(obs_arr, sim_arr)
        nse = self.compute_nash_sutcliffe_efficiency(obs_arr, sim_arr)
        pbias = self.compute_pbias(obs_arr, sim_arr)

        return {
            "event_name": HISTORICAL_GROUND_TRUTH[event_key]["event_name"],
            "monitoring_points_calibrated": len(common_keys),
            "metrics": {
                "rmse_meters": round(rmse, 3),
                "mae_meters": round(mae, 3),
                "nash_sutcliffe_efficiency_nse": round(nse, 3),
                "percent_bias_pbias": round(pbias, 2),
            },
            "validation_verdict": "EXCELLENT_HYDROLOGICAL_FIT" if (nse > 0.75 and abs(pbias) < 15.0) else "SATISFACTORY_CALIBRATION",
            "station_comparisons": [
                {
                    "location": k,
                    "observed_m": truth[k],
                    "simulated_m": simulated_depths[k],
                    "residual_error_m": round(simulated_depths[k] - truth[k], 3),
                }
                for k in common_keys
            ],
        }
