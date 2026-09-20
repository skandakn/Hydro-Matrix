"""
HYDRO MATRIX : 18 Automatic Weather Station (AWS) Ingest & Telemetry Engine
Simulates live meteorological sensor streams across Guwahati's urban topography.
"""

import time
import random
from typing import List, Dict, Any
from backend.simulation.city_grid import AWS_STATIONS_CATALOG


class AWSTelemetryIngestService:
    """
    Ingests and normalizes real-time meteorological sensor feeds
    from all 18 government-installed Automatic Weather Stations in Guwahati.
    """

    def __init__(self):
        self.stations = list(AWS_STATIONS_CATALOG)
        self.last_update_timestamp = time.time()

    def generate_live_readings(self, base_rainfall_mm_hr: float) -> List[Dict[str, Any]]:
        """
        Synthesizes real-time sensory telemetry (Rainfall, Temp, Pressure, Humidity)
        calibrated to localized microclimates and foothill elevation gradients.
        """
        readings = []
        for s in self.stations:
            # Foothills receive higher precipitation due to orographic lift
            orographic = 1.30 if s["elevation"] > 70 else (1.15 if s["elevation"] > 55 else 1.0)
            jitter = random.uniform(-2.5, 2.5)
            station_rain = max(0.0, (base_rainfall_mm_hr * orographic) + jitter)

            readings.append({
                "station_code": s["id"],
                "station_name": s["name"],
                "grid_x": s["x"],
                "grid_y": s["y"],
                "elevation_msl": s["elevation"],
                "rainfall_mm_hr": round(station_rain, 1),
                "accumulated_24h_mm": round(station_rain * 2.8 + random.uniform(20.0, 45.0), 1),
                "humidity_percent": round(min(100.0, 88.0 + (station_rain * 0.2)), 1),
                "temperature_celsius": round(28.0 - (s["elevation"] - 50.0) * 0.05, 1),
                "barometric_pressure_hpa": round(1005.0 - (station_rain * 0.08), 1),
                "wind_speed_kmh": round(10.0 + random.uniform(0.0, 8.0), 1),
                "battery_health_percent": 95,
                "link_status": "ONLINE" if station_rain < 140.0 else "WARNING_HIGH_RAIN",
            })

        return readings
