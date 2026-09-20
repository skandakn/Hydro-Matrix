"""
HYDRO MATRIX : Dijkstra & A* Safe Evacuation Graph Routing Engine
Computes optimal civilian egress corridors through high-ground road networks,
dynamically penalizing submerged intersections and impassable roadways (h > 0.35m).
"""

import heapq
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from backend.simulation.city_grid import GRID_WIDTH, GRID_HEIGHT, GUWAHATI_TOPOGRAPHY_GRID

IMPASSABLE_DEPTH_METERS = 0.35  # Maximum vehicle wading limit for light ambulances
CRITICAL_WALKING_DEPTH = 0.60   # Absolute wading danger threshold


class EvacuationGraphRouter:
    """
    Geospatial graph routing solver operating on discrete 18x18 Guwahati topology.
    Assigns time-varying hydraulic impedance weights to cell transitions:
    Weight(u, v) = Distance + Penalties(Inundation Depth, Head Gradient, Debris)
    """

    def __init__(self, cell_distance_km: float = 0.25):
        self.dx_km = cell_distance_km
        self.ny = GRID_HEIGHT
        self.nx = GRID_WIDTH

    def _get_neighbors(self, y: int, x: int) -> List[Tuple[int, int]]:
        """Returns 8-connected directional movement neighbors."""
        neighbors = []
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                if dy == 0 and dx == 0:
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < self.ny and 0 <= nx < self.nx:
                    # Avoid northern receiving Brahmaputra river channel (Rows 0-1)
                    if ny >= 2:
                        neighbors.append((ny, nx))
        return neighbors

    def compute_edge_impedance(
        self,
        y1: int, x1: int,
        y2: int, x2: int,
        depth_matrix: np.ndarray,
        elevation_matrix: np.ndarray
    ) -> float:
        """
        Calculates hydrological impedance cost between adjacent sectors:
        Cost = Euclidean_Dist * (1.0 + Depth_Penalty + Slope_Penalty)
        """
        euclidean_dist = np.hypot(x2 - x1, y2 - y1) * self.dx_km
        dest_depth = float(depth_matrix[y2, x2])
        dest_elev = float(elevation_matrix[y2, x2])
        src_elev = float(elevation_matrix[y1, x1])

        # 1. Hard Disqualification: Deep submerged water
        if dest_depth >= CRITICAL_WALKING_DEPTH:
            return float("inf")

        # 2. Inundation Wading Penalty
        depth_factor = 1.0
        if dest_depth > IMPASSABLE_DEPTH_METERS:
            depth_factor = 8.0  # Severe wading delay
        elif dest_depth > 0.15:
            depth_factor = 3.5  # Moderate ponding
        elif dest_depth > 0.05:
            depth_factor = 1.8

        # 3. Slope Penalty (Climbing uphill slightly increases cost, steep drops are dangerous)
        slope = (dest_elev - src_elev) / (self.dx_km * 1000.0)
        slope_factor = 1.0 + max(0.0, slope * 2.0)

        return euclidean_dist * depth_factor * slope_factor

    def find_safest_evacuation_path(
        self,
        start_y: int, start_x: int,
        target_camps: List[Tuple[int, int]],
        depth_matrix: np.ndarray,
        elevation_matrix: np.ndarray = GUWAHATI_TOPOGRAPHY_GRID
    ) -> Optional[Dict[str, Any]]:
        """
        Executes Dijkstra's single-source multi-target shortest path algorithm
        to determine the lowest-risk evacuation route to nearest elevated haven.
        """
        target_set = set(target_camps)
        distances = {(y, x): float("inf") for y in range(self.ny) for x in range(self.nx)}
        previous = {}
        priority_queue = [(0.0, start_y, start_x)]
        distances[(start_y, start_x)] = 0.0

        visited = set()

        while priority_queue:
            current_dist, cur_y, cur_x = heapq.heappop(priority_queue)

            if (cur_y, cur_x) in visited:
                continue
            visited.add((cur_y, cur_x))

            # Destination sanctuary reached!
            if (cur_y, cur_x) in target_set:
                path = []
                curr = (cur_y, cur_x)
                while curr in previous:
                    path.append(curr)
                    curr = previous[curr]
                path.append((start_y, start_x))
                path.reverse()

                # Calculate total journey metrics
                total_km = len(path) * self.dx_km
                max_depth_encountered = max(float(depth_matrix[py, px]) for py, px in path)
                est_minutes = int((total_km / 3.5) * 60.0 + (max_depth_encountered * 15.0))

                return {
                    "destination_camp": (cur_y, cur_x),
                    "path_coordinates": [{"y": py, "x": px} for py, px in path],
                    "total_distance_km": round(total_km, 2),
                    "estimated_evacuation_time_minutes": max(5, est_minutes),
                    "max_water_depth_en_route_m": round(max_depth_encountered, 2),
                    "route_viability": "SAFE" if max_depth_encountered < 0.15 else ("CAUTION_PONDING" if max_depth_encountered < IMPASSABLE_DEPTH_METERS else "HAZARDOUS"),
                }

            # Explore neighbors
            for ny, nx in self._get_neighbors(cur_y, cur_x):
                if (ny, nx) in visited:
                    continue

                edge_cost = self.compute_edge_impedance(
                    cur_y, cur_x, ny, nx, depth_matrix, elevation_matrix
                )

                if edge_cost == float("inf"):
                    continue

                new_dist = current_dist + edge_cost
                if new_dist < distances[(ny, nx)]:
                    distances[(ny, nx)] = new_dist
                    previous[(ny, nx)] = (cur_y, cur_x)
                    heapq.heappush(priority_queue, (new_dist, ny, nx))

        # No safe viable path exists (sector isolated by floodwaters)
        return None
