"""
HYDRO MATRIX : 20 GMDA Dewatering Pump Stations SCADA Supervisor
Manages operational states, RPM telemetry, diesel-hybrid generators, and discharge.
"""

from typing import List, Dict, Any

GMDA_PUMP_CONFIGS: List[Dict[str, Any]] = [
    {"id": "gmda-p01", "name": "Anil Nagar Heavy Station #1", "x": 8, "y": 5, "capacity_m3hr": 3000, "channel": "Bharalu"},
    {"id": "gmda-p02", "name": "Anil Nagar Heavy Station #2", "x": 8, "y": 5, "capacity_m3hr": 3000, "channel": "Bharalu"},
    {"id": "gmda-p03", "name": "Nabin Nagar Inlet Pump #1", "x": 8, "y": 6, "capacity_m3hr": 2800, "channel": "Bharalu"},
    {"id": "gmda-p04", "name": "Nabin Nagar Inlet Pump #2", "x": 8, "y": 6, "capacity_m3hr": 2800, "channel": "Bharalu"},
    {"id": "gmda-p05", "name": "Tarun Nagar Canal Relief Pump", "x": 7, "y": 6, "capacity_m3hr": 2200, "channel": "Bharalu"},
    {"id": "gmda-p06", "name": "Rukminigaon Sump Station #1", "x": 11, "y": 8, "capacity_m3hr": 2500, "channel": "Bahini"},
    {"id": "gmda-p07", "name": "Rukminigaon Sump Station #2", "x": 11, "y": 8, "capacity_m3hr": 2500, "channel": "Bahini"},
    {"id": "gmda-p08", "name": "Zoo Road / Tiniali Depressional Pump", "x": 9, "y": 6, "capacity_m3hr": 2400, "channel": "Bharalu"},
    {"id": "gmda-p09", "name": "Bhangagarh GMCH Flyover Sump", "x": 8, "y": 8, "capacity_m3hr": 2200, "channel": "Bahini"},
    {"id": "gmda-p10", "name": "Lachit Nagar Relief Station", "x": 7, "y": 7, "capacity_m3hr": 2000, "channel": "Bharalu"},
    {"id": "gmda-p11", "name": "Rajgarh Road Culvert Collector", "x": 7, "y": 7, "capacity_m3hr": 1900, "channel": "Bharalu"},
    {"id": "gmda-p12", "name": "Hatigaon Sijubari Drainage Pump", "x": 11, "y": 11, "capacity_m3hr": 2100, "channel": "Bahini"},
    {"id": "gmda-p13", "name": "Down Town / GS Road Station", "x": 12, "y": 9, "capacity_m3hr": 2000, "channel": "Bahini"},
    {"id": "gmda-p14", "name": "Six Mile VIP Road Interceptor", "x": 13, "y": 8, "capacity_m3hr": 2200, "channel": "Bahini"},
    {"id": "gmda-p15", "name": "Beltola Tiniali Headwater Pump", "x": 12, "y": 12, "capacity_m3hr": 2300, "channel": "Bahini"},
    {"id": "gmda-p16", "name": "Mora Bharalu Inflow Diversion #1", "x": 6, "y": 8, "capacity_m3hr": 2600, "channel": "Mora Bharalu"},
    {"id": "gmda-p17", "name": "Mora Bharalu Inflow Diversion #2", "x": 6, "y": 8, "capacity_m3hr": 2600, "channel": "Mora Bharalu"},
    {"id": "gmda-p18", "name": "Bharalumukh Outfall Heavy Lift #1", "x": 5, "y": 2, "capacity_m3hr": 3500, "channel": "Brahmaputra Outfall"},
    {"id": "gmda-p19", "name": "Bharalumukh Outfall Heavy Lift #2", "x": 5, "y": 2, "capacity_m3hr": 3500, "channel": "Brahmaputra Outfall"},
    {"id": "gmda-p20", "name": "Lakhimijan Jalukbari Interceptor", "x": 4, "y": 2, "capacity_m3hr": 2400, "channel": "Lakhimijan"},
]


class GMDAPumpSupervisor:
    """
    Supervises operational health, automatic priming, and total discharge
    over the 20 heavy-duty auto-priming GMDA dewatering pumps.
    """

    def __init__(self):
        self.pumps_state = {p["id"]: True for p in GMDA_PUMP_CONFIGS}

    def get_operational_status(self) -> List[Dict[str, Any]]:
        status_list = []
        for p in GMDA_PUMP_CONFIGS:
            is_active = self.pumps_state[p["id"]]
            status_list.append({
                "pump_id": p["id"],
                "name": p["name"],
                "grid_x": p["x"],
                "grid_y": p["y"],
                "capacity_m3hr": p["capacity_m3hr"],
                "channel_discharge": p["channel"],
                "is_active": is_active,
                "current_rpm": 1480 if is_active else 0,
                "current_discharge_m3hr": int(p["capacity_m3hr"] * 0.95) if is_active else 0,
                "auto_priming_armed": True,
                "power_source": "DUAL_HYBRID_GRID_DIESEL",
            })
        return status_list

    def set_pump_state(self, pump_id: str, active: bool):
        if pump_id in self.pumps_state:
            self.pumps_state[pump_id] = active

    def set_all_pumps(self, active: bool):
        for pid in self.pumps_state:
            self.pumps_state[pid] = active

    def get_total_active_count(self) -> int:
        return sum(1 for is_active in self.pumps_state.values() if is_active)
