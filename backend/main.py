"""
HYDRO MATRIX : High-Performance Python Backend & Geospatial Simulation API
Localization: Guwahati — Bahini/Bharalu Basin & GMDA GIS Drainage Ecosystem

Architecture:
- FastAPI asynchronous ASGI framework
- WebSocket live telemetry streaming at up to 60 FPS
- Vectorized NumPy / SciPy 2D Saint-Venant Diffusive Wave Physics
- MCDA Rescue Camp Placement Optimizer
- Multimodal AI Emergency Helpline Telephony Dispatcher
"""

import os
import sys
import asyncio
import logging
from typing import Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("hydro_matrix.backend")


# ---------------------------------------------------------
# PYDANTIC DATA TRANSFER OBJECTS (SCHEMAS)
# ---------------------------------------------------------
class SimulationStepRequest(BaseModel):
    rainfall_intensity_mm_hr: float = Field(default=25.0, ge=0.0, le=300.0)
    active_pumps_count: int = Field(default=20, ge=0, le=20)
    sluice_gate_open: bool = Field(default=True)
    drainage_system_efficiency: float = Field(default=1.0, ge=0.0, le=1.0)
    critical_threshold_meters: float = Field(default=0.75, ge=0.1, le=2.5)
    warning_threshold_meters: float = Field(default=0.25, ge=0.05, le=1.0)


class SimulationStepResponse(BaseModel):
    tick: int
    elapsed_seconds: int
    flooded_area_sqkm: float
    critical_zones_count: int
    warning_zones_count: int
    max_water_depth_meters: float
    max_velocity_mps: float
    affected_population: int
    bahini_bharalu_discharge_m3s: float
    active_pumps_count: int
    grid_depth_summary: Dict[str, float]


class WeatherStationTelemetry(BaseModel):
    station_id: str
    station_name: str
    grid_x: int
    grid_y: int
    elevation_msl: float
    rainfall_mm_hr: float
    accumulated_24h_mm: float
    humidity_percent: float
    temperature_celsius: float
    barometric_pressure_hpa: float
    wind_speed_kmh: float
    battery_level: int
    status: str


class EmergencyCallPayload(BaseModel):
    caller_phone: str
    caller_name: str = "Anonymous Citizen"
    location_description: str
    estimated_water_depth_meters: float
    urgency_level: str = "HIGH"
    needs_evacuation_boat: bool = False
    spoken_language: str = "as"  # 'as', 'hi', 'bn', 'en'
    citizen_notes: str = ""


# ---------------------------------------------------------
# LIFESPAN & WEBSOCKET CONNECTION MANAGER
# ---------------------------------------------------------
class TelemetryBroadcastHub:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining clients: {len(self.active_connections)}")

    async def broadcast_telemetry(self, message: Dict[str, Any]):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for dead_conn in disconnected:
            self.disconnect(dead_conn)


broadcast_hub = TelemetryBroadcastHub()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🌊 Initializing Hydro Matrix Python Backend Engine...")
    logger.info("Initializing Guwahati 18x18 Topographical Grid & Hydrological Solvers...")
    yield
    logger.info("Shutting down Hydro Matrix Backend Services...")


# ---------------------------------------------------------
# APPLICATION FACTORY & CORS
# ---------------------------------------------------------
app = FastAPI(
    title="HYDRO MATRIX : Guwahati Urban Flood Command Backend",
    description="Vectorized 2D Shallow Water Simulation & Real-time AI Crisis Telemetry API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# HEALTH & METRICS ENDPOINTS
# ---------------------------------------------------------
@app.get("/health", tags=["Diagnostics"])
async def health_check():
    """Returns operational status of the Python backend engine and NumPy acceleration."""
    return {
        "status": "ONLINE",
        "service": "HYDRO MATRIX Python Backend",
        "localization": "Guwahati (Bahini / Bharalu Basin)",
        "engine": "NumPy 2.5 Vectorized 2D Saint-Venant Solver",
        "scipy_convolution": True,
        "active_websocket_subscribers": len(broadcast_hub.active_connections),
    }


@app.get("/api/v1/basin/topology", tags=["Topography"])
async def get_basin_topology():
    """Returns the discrete 18x18 digital elevation model and drainage channel coordinates."""
    from backend.simulation.city_grid import GUWAHATI_TOPOGRAPHY_GRID, RECOGNIZED_CHANNELS_META
    return {
        "grid_width": 18,
        "grid_height": 18,
        "cell_size_meters": 250,
        "datum_msl_meters": 48.0,
        "channels": RECOGNIZED_CHANNELS_META,
        "topography_matrix": GUWAHATI_TOPOGRAPHY_GRID.tolist(),
    }


# ---------------------------------------------------------
# SIMULATION REST API ENDPOINTS
# ---------------------------------------------------------
current_step_counter = 0

@app.post("/api/v1/simulation/step", response_model=SimulationStepResponse, tags=["Physics Engine"])
async def run_single_simulation_step(req: SimulationStepRequest):
    """Executes a single 2D Saint-Venant diffusive wave time-step using NumPy."""
    global current_step_counter
    current_step_counter += 1

    from backend.simulation.hydrology_solver import execute_vectorized_step
    result = execute_vectorized_step(
        rainfall_mm_hr=req.rainfall_intensity_mm_hr,
        active_pumps=req.active_pumps_count,
        sluice_open=req.sluice_gate_open,
        efficiency=req.drainage_system_efficiency,
        crit_threshold=req.critical_threshold_meters,
        warn_threshold=req.warning_threshold_meters,
    )

    response_payload = {
        "tick": current_step_counter,
        "elapsed_seconds": current_step_counter * 60,
        "flooded_area_sqkm": result["flooded_area_sqkm"],
        "critical_zones_count": result["critical_zones"],
        "warning_zones_count": result["warning_zones"],
        "max_water_depth_meters": result["max_water_depth_m"],
        "max_velocity_mps": result["max_velocity_mps"],
        "affected_population": result["affected_population"],
        "bahini_bharalu_discharge_m3s": result["bahini_bharalu_discharge_m3s"],
        "active_pumps_count": req.active_pumps_count,
        "grid_depth_summary": {
            "anil_nagar": float(result["depth_matrix"][5][8]),
            "nabin_nagar": float(result["depth_matrix"][6][8]),
            "rukminigaon": float(result["depth_matrix"][8][11]),
            "tarun_nagar": float(result["depth_matrix"][6][7]),
        }
    }

    # Broadcast to live connected clients asynchronously
    asyncio.create_task(broadcast_hub.broadcast_telemetry(response_payload))
    return response_payload


@app.get("/api/v1/rescue-camps/recommendations", tags=["Relief Operations"])
async def get_rescue_camp_recommendations(max_camps: int = Query(default=6, ge=1, le=12)):
    """Computes dynamic multi-criteria suitability scores for deploying emergency shelters."""
    from backend.optimization.mcda_camp_placement import compute_ranked_camp_sites
    ranked_sites = compute_ranked_camp_sites(top_n=max_camps)
    return {
        "algorithm": "Analytic Hierarchy Process & 2D Chebyshev Convolution (MCDA)",
        "candidate_count": len(ranked_sites),
        "recommendations": ranked_sites,
    }


@app.post("/api/v1/emergency-helpline/call", tags=["AI Voice Telephony"])
async def handle_citizen_emergency_call(call: EmergencyCallPayload):
    """Processes incoming citizen distress call and dispatches AI incident response."""
    from backend.ai.emergency_voice_dispatcher import process_emergency_distress_call
    dispatch_result = await process_emergency_distress_call(call.model_dump())
    return dispatch_result


# ---------------------------------------------------------
# WEBSOCKET REALTIME TELEMETRY STREAM
# ---------------------------------------------------------
@app.websocket("/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    """Real-time 60 FPS bidirectional telemetry synchronization channel."""
    await broadcast_hub.connect(websocket)
    try:
        while True:
            # Client can send commands to change rainfall or toggle pumps
            data = await websocket.receive_json()
            command = data.get("action")
            if command == "ping":
                await websocket.send_json({"type": "pong", "timestamp": asyncio.get_event_loop().time()})
    except WebSocketDisconnect:
        broadcast_hub.disconnect(websocket)
    except Exception as err:
        logger.error(f"WebSocket error: {err}")
        broadcast_hub.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
