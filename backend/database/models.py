"""
HYDRO MATRIX : Database ORM & Persistence Models
Schemas for simulation checkpoints, AWS telemetry timeseries, and emergency call triage.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SimulationRunRecord(BaseModel):
    session_id: str
    scenario_name: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    total_ticks_simulated: int = 0
    peak_flooded_area_sqkm: float = 0.0
    peak_affected_residents: int = 0
    max_depth_recorded_m: float = 0.0
    pumps_active_count: int = 20
    sluice_state: str = "OPEN"
    notes: Optional[str] = None


class AWSSensorCheckpoint(BaseModel):
    station_code: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    rainfall_mm_hr: float
    accumulated_24h_mm: float
    humidity_percent: float
    temperature_celsius: float
    barometric_pressure_hpa: float
    status: str = "ONLINE"


class EmergencyIncidentRecord(BaseModel):
    call_id: str
    caller_phone: str
    caller_name: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ward_location: str
    water_depth_meters: float
    urgency_level: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    evacuation_boat_dispatched: bool = False
    assigned_shelter_id: Optional[str] = None
    transcript_summary: Optional[str] = None
    audio_recording_url: Optional[str] = None


class SituationReportRecord(BaseModel):
    report_id: str
    tick: int
    elapsed_seconds: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    flooded_area_sqkm: float
    affected_population: int
    critical_zones_count: int
    active_pumps_count: int
    bahini_bharalu_discharge_m3s: float
    compromised_infrastructures: List[str] = []
    executive_recommendations: List[str] = []
