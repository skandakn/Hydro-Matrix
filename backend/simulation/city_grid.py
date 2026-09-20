"""
HYDRO MATRIX : Guwahati Topography & Geospatial Grid Discretization
Calibrated 18x18 Discrete Elevation Model (250m cell resolution, 4.5 km x 4.5 km)
"""

import numpy as np
from typing import Dict, List, Any

GRID_WIDTH = 18
GRID_HEIGHT = 18
CELL_SIZE_METERS = 250.0
CELL_AREA_SQ_METERS = CELL_SIZE_METERS * CELL_SIZE_METERS  # 62,500 m²

# ---------------------------------------------------------
# DISCRETE DIGITAL ELEVATION MODEL (Z) IN METERS ABOVE MSL
# ---------------------------------------------------------
# Calibrated against Survey of India (SOI) contour maps and Brahmaputra Board datums
GUWAHATI_TOPOGRAPHY_GRID = np.array([
    # Row 0: Northern Brahmaputra River Basin (Receiving Outfall Corridor)
    [48.5, 48.6, 48.5, 48.4, 48.5, 48.2, 48.3, 48.4, 48.5, 48.5, 48.6, 48.5, 48.4, 48.5, 48.6, 48.5, 48.4, 48.5],
    # Row 1: Brahmaputra River South Embankment & Strand Road
    [49.0, 49.1, 49.0, 48.9, 49.0, 48.8, 48.9, 49.0, 49.1, 49.0, 49.1, 49.0, 48.9, 49.0, 49.1, 49.0, 48.9, 49.0],
    # Row 2: Kamakhya Foothills (West) to Panbazar & Bharalumukh Sluice
    [52.0, 54.0, 142.0, 68.0, 50.5, 49.5, 51.0, 52.0, 52.5, 53.0, 53.5, 54.0, 54.5, 55.0, 56.4, 55.5, 54.5, 53.5],
    # Row 3: Maligaon, Panbazar District Court, Fancy Bazar
    [52.5, 53.0, 75.0, 52.8, 51.0, 51.2, 51.8, 52.2, 52.8, 53.2, 53.6, 54.2, 54.8, 55.2, 55.8, 55.0, 54.0, 53.0],
    # Row 4: Jalukbari Corridor, Chandmari AEI Grounds, Noonmati
    [53.0, 53.5, 54.0, 52.0, 51.5, 51.8, 52.5, 52.8, 53.0, 53.5, 54.0, 54.5, 55.0, 55.5, 56.0, 55.5, 54.5, 53.5],
    # Row 5: Anil Nagar Depression Bowl & Pub Sarania
    [52.0, 52.5, 53.0, 51.5, 51.0, 51.2, 51.0, 50.2, 49.2, 50.5, 51.5, 52.5, 53.5, 54.5, 55.0, 54.5, 53.5, 52.5],
    # Row 6: Tarun Nagar, Nabin Nagar & Zoo Road Culvert Confluence
    [51.5, 52.0, 55.0, 51.0, 50.5, 50.8, 50.2, 49.3, 49.0, 49.8, 51.0, 52.0, 53.0, 54.0, 54.5, 54.0, 53.0, 52.0],
    # Row 7: Rajgarh Road, Lachit Nagar & Bharalu Mid-reach
    [51.2, 51.5, 52.0, 50.5, 50.2, 50.4, 50.0, 49.8, 49.5, 50.2, 51.2, 52.2, 52.8, 53.5, 54.0, 53.5, 52.5, 51.5],
    # Row 8: Bhangagarh (GMCH), Bahini Spine, Rukminigaon Bowl
    [51.0, 51.2, 51.5, 50.2, 50.0, 50.2, 50.5, 50.8, 50.5, 50.1, 50.8, 49.5, 51.5, 52.9, 53.2, 53.0, 52.0, 51.0],
    # Row 9: Barsapara ACA Stadium, Dispur Capital Secretariat
    [51.4, 51.5, 51.8, 50.5, 50.2, 50.8, 51.6, 51.5, 51.8, 51.2, 51.8, 52.4, 52.8, 53.0, 53.5, 53.2, 52.5, 51.5],
    # Row 10: Fatasil Ambari, Kahilipara Hill Ridge
    [52.0, 51.8, 52.2, 51.0, 50.8, 51.2, 52.0, 53.5, 68.2, 54.0, 52.5, 52.0, 52.5, 53.0, 53.8, 53.5, 52.8, 52.0],
    # Row 11: Hatigaon Lowlands, Sijubari
    [51.8, 51.5, 51.2, 50.8, 50.5, 50.8, 51.2, 52.0, 53.0, 52.5, 51.8, 50.8, 52.0, 52.8, 53.5, 53.2, 52.5, 51.8],
    # Row 12: Beltola Chariali & Bahini Upper Catchment
    [52.5, 52.0, 51.5, 51.0, 50.8, 51.0, 51.5, 52.5, 54.0, 53.5, 52.8, 52.0, 55.2, 54.0, 54.5, 54.0, 53.2, 52.5],
    # Row 13: Gorchuk, Deepor Beel Marshland Outflow, Khanapara
    [53.0, 52.5, 51.8, 51.2, 50.5, 51.5, 52.0, 53.0, 55.0, 54.2, 53.5, 53.0, 54.5, 56.0, 58.0, 61.5, 55.0, 53.5],
    # Row 14: Lokhra Chariali, ISBT Interstate Bus Terminus
    [54.0, 53.2, 52.5, 51.8, 51.2, 52.0, 53.0, 54.1, 56.5, 53.6, 54.0, 54.5, 56.0, 58.5, 62.0, 65.0, 58.0, 55.0],
    # Row 15: Basistha Temple Confluence, Khasi Hill Escarpment
    [56.0, 55.0, 54.0, 53.0, 52.5, 53.5, 55.0, 56.5, 60.0, 58.0, 57.5, 58.0, 62.0, 68.0, 78.5, 72.0, 65.0, 60.0],
    # Row 16: Meghalaya / Khasi Foothills Escalation
    [65.0, 64.0, 62.0, 60.0, 58.0, 62.0, 65.0, 68.0, 72.0, 75.0, 78.0, 80.0, 82.0, 85.0, 88.0, 86.0, 80.0, 75.0],
    # Row 17: Southern Mountain Catchment Ridge
    [85.0, 84.0, 82.0, 80.0, 78.0, 82.0, 85.0, 88.0, 92.0, 95.0, 98.0, 100.0, 102.0, 105.0, 110.0, 108.0, 95.0, 90.0],
], dtype=np.float64)

# ---------------------------------------------------------
# 5 RECOGNIZED PRIMARY DRAINAGE CHANNELS METADATA
# ---------------------------------------------------------
RECOGNIZED_CHANNELS_META: Dict[str, Dict[str, Any]] = {
    "Bharalu": {
        "name": "Bharalu River (ভৰলু নদী)",
        "length_km": 6.2,
        "origin": "Zoo Road Confluence",
        "outfall": "Brahmaputra River via Bharalumukh Sluice Gate",
        "design_capacity_m3s": 75.0,
        "current_capacity_m3s": 48.5,
        "status": "SILTED",
        "color_hex": "#06b6d4",
    },
    "Bahini": {
        "name": "Bahini River (বাহিনী নদী)",
        "length_km": 5.6,
        "origin": "Beltola / Basistha Confluence",
        "outfall": "Bharalu Confluence at Zoo Road",
        "design_capacity_m3s": 45.0,
        "current_capacity_m3s": 32.5,
        "status": "CHOKED",
        "color_hex": "#f59e0b",
    },
    "Mora Bharalu": {
        "name": "Mora Bharalu (মৰা ভৰলু)",
        "length_km": 4.8,
        "origin": "Barsapara / Fatasil Runoff",
        "outfall": "Deepor Beel Ramsar Wetland Basin",
        "design_capacity_m3s": 50.0,
        "current_capacity_m3s": 28.0,
        "status": "OPTIMAL",
        "color_hex": "#3b82f6",
    },
    "Basistha": {
        "name": "Basistha River (বশিষ্ঠ নদী)",
        "length_km": 7.4,
        "origin": "Meghalaya / Khasi Foothills",
        "outfall": "Transitions into Bahini at Beltola",
        "design_capacity_m3s": 65.0,
        "current_capacity_m3s": 36.2,
        "status": "OPTIMAL",
        "color_hex": "#10b981",
    },
    "Lakhimijan": {
        "name": "Lakhimijan Channel (লাখিমীজান)",
        "length_km": 3.9,
        "origin": "Deepor Beel Northern Outlet",
        "outfall": "Brahmaputra River near Jalukbari",
        "design_capacity_m3s": 40.0,
        "current_capacity_m3s": 22.0,
        "status": "BACKFLOW_RISK",
        "color_hex": "#8b5cf6",
    },
}

# ---------------------------------------------------------
# 18 AUTOMATIC WEATHER STATIONS (AWS) DATA
# ---------------------------------------------------------
AWS_STATIONS_CATALOG: List[Dict[str, Any]] = [
    {"id": "GHY-AWS-01", "name": "Dispur Secretariat", "x": 11, "y": 9, "elevation": 52.4},
    {"id": "GHY-AWS-02", "name": "Panbazar DC Office", "x": 5, "y": 3, "elevation": 51.2},
    {"id": "GHY-AWS-03", "name": "Jalukbari Gauhati Univ", "x": 2, "y": 4, "elevation": 54.0},
    {"id": "GHY-AWS-04", "name": "Khanapara Vet College", "x": 15, "y": 13, "elevation": 61.5},
    {"id": "GHY-AWS-05", "name": "Borjhar LGBI Airport", "x": 1, "y": 10, "elevation": 51.8},
    {"id": "GHY-AWS-06", "name": "Beltola Chariali", "x": 12, "y": 12, "elevation": 55.2},
    {"id": "GHY-AWS-07", "name": "Chandmari AEI Field", "x": 8, "y": 4, "elevation": 53.0},
    {"id": "GHY-AWS-08", "name": "Zoo Road RG Baruah", "x": 9, "y": 6, "elevation": 50.1},
    {"id": "GHY-AWS-09", "name": "Noonmati IOCL Refinery", "x": 14, "y": 4, "elevation": 56.4},
    {"id": "GHY-AWS-10", "name": "Maligaon NFR HQ", "x": 3, "y": 3, "elevation": 52.8},
    {"id": "GHY-AWS-11", "name": "Bharalumukh Sluice", "x": 5, "y": 2, "elevation": 49.5},
    {"id": "GHY-AWS-12", "name": "Basistha Mandir Foothills", "x": 14, "y": 15, "elevation": 78.5},
    {"id": "GHY-AWS-13", "name": "Lalmati ISBT Terminal", "x": 9, "y": 14, "elevation": 53.6},
    {"id": "GHY-AWS-14", "name": "Kahilipara Hill Ridge", "x": 8, "y": 10, "elevation": 68.2},
    {"id": "GHY-AWS-15", "name": "Lokhra Chariali", "x": 7, "y": 14, "elevation": 54.1},
    {"id": "GHY-AWS-16", "name": "Gorchuk Basin", "x": 5, "y": 13, "elevation": 51.5},
    {"id": "GHY-AWS-17", "name": "VIP Road Six Mile", "x": 13, "y": 8, "elevation": 52.9},
    {"id": "GHY-AWS-18", "name": "Hatigaon High School", "x": 11, "y": 11, "elevation": 50.8},
]
