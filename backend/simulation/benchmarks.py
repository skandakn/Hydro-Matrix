"""
HYDRO MATRIX : Monte Carlo Scenario Sensitivity & Parameter Sweep Benchmarks
Automated computational benchmarks evaluating Guwahati basin resilience
across 5 canonical scenarios and 50 stochastic parameter permutations.
"""

import time
import numpy as np
from typing import Dict, List, Any
from backend.simulation.hydrology_solver import execute_vectorized_step


CANONICAL_SCENARIOS = {
    "monsoon_baseline": {
        "name": "Monsoon Baseline (25 mm/h)",
        "rainfall_mm_hr": 25.0,
        "active_pumps": 20,
        "sluice_open": True,
        "efficiency": 1.0,
    },
    "khasi_cloudburst": {
        "name": "Khasi Foothill Cloudburst (170 mm/h)",
        "rainfall_mm_hr": 170.0,
        "active_pumps": 20,
        "sluice_open": True,
        "efficiency": 1.0,
    },
    "pump_blackout": {
        "name": "GMDA 20-Pump Grid Blackout",
        "rainfall_mm_hr": 60.0,
        "active_pumps": 0,
        "sluice_open": True,
        "efficiency": 0.0,
    },
    "sluice_lock": {
        "name": "Brahmaputra Stage Sluice Lock (Backwater)",
        "rainfall_mm_hr": 80.0,
        "active_pumps": 20,
        "sluice_open": False,
        "efficiency": 1.0,
    },
    "culvert_debris_choke": {
        "name": "Zoo Road Culvert Silt & Debris Choke",
        "rainfall_mm_hr": 75.0,
        "active_pumps": 20,
        "sluice_open": True,
        "efficiency": 0.15,
    },
}


def run_single_scenario_benchmark(scenario_key: str, ticks: int = 10) -> Dict[str, Any]:
    """Runs a multi-step timeseries benchmark for a specific scenario preset."""
    if scenario_key not in CANONICAL_SCENARIOS:
        raise ValueError(f"Unknown scenario key: {scenario_key}")

    cfg = CANONICAL_SCENARIOS[scenario_key]
    timeline = []
    start_wall_time = time.perf_counter()

    peak_flooded_area = 0.0
    peak_population_distress = 0
    max_depth_recorded = 0.0

    for tick in range(1, ticks + 1):
        step_result = execute_vectorized_step(
            rainfall_mm_hr=cfg["rainfall_mm_hr"],
            active_pumps=cfg["active_pumps"],
            sluice_open=cfg["sluice_open"],
            efficiency=cfg["efficiency"],
        )

        area = step_result["flooded_area_sqkm"]
        pop = step_result["affected_population"]
        depth = step_result["max_water_depth_m"]

        if area > peak_flooded_area:
            peak_flooded_area = area
        if pop > peak_population_distress:
            peak_population_distress = pop
        if depth > max_depth_recorded:
            max_depth_recorded = depth

        timeline.append({
            "tick": tick,
            "elapsed_minutes": tick * 15,
            "flooded_area_sqkm": area,
            "affected_residents": pop,
            "max_water_depth_m": depth,
            "critical_sectors": step_result["critical_zones"],
        })

    elapsed_wall_ms = round((time.perf_counter() - start_wall_time) * 1000.0, 2)

    return {
        "scenario_key": scenario_key,
        "scenario_name": cfg["name"],
        "simulated_ticks": ticks,
        "computation_time_ms": elapsed_wall_ms,
        "fps_throughput": round(ticks / (elapsed_wall_ms / 1000.0), 1) if elapsed_wall_ms > 0 else 999.0,
        "peak_flooded_area_sqkm": round(peak_flooded_area, 2),
        "peak_affected_population": peak_population_distress,
        "max_surface_depth_m": round(max_depth_recorded, 2),
        "timeseries_progression": timeline,
    }


def run_monte_carlo_sensitivity_analysis(num_iterations: int = 50) -> Dict[str, Any]:
    """
    Executes a Monte Carlo stochastic parameter sweep across varying rainfall intensities
    (20 to 180 mm/hr) and random pump failure counts (0 to 20 active pumps).
    """
    np.random.seed(42)
    rainfall_samples = np.random.uniform(20.0, 180.0, num_iterations)
    pump_samples = np.random.randint(0, 21, num_iterations)
    sluice_samples = np.random.choice([True, False], p=[0.75, 0.25], size=num_iterations)

    areas = []
    populations = []

    for i in range(num_iterations):
        res = execute_vectorized_step(
            rainfall_mm_hr=float(rainfall_samples[i]),
            active_pumps=int(pump_samples[i]),
            sluice_open=bool(sluice_samples[i]),
            efficiency=1.0,
        )
        areas.append(res["flooded_area_sqkm"])
        populations.append(res["affected_population"])

    return {
        "iterations": num_iterations,
        "flooded_area_mean_sqkm": round(float(np.mean(areas)), 2),
        "flooded_area_std_sqkm": round(float(np.std(areas)), 2),
        "flooded_area_p95_sqkm": round(float(np.percentile(areas, 95)), 2),
        "affected_pop_mean": int(np.mean(populations)),
        "affected_pop_p95": int(np.percentile(populations, 95)),
    }
