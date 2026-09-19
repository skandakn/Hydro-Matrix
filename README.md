# 🌊 HYDRO-MATRIX: FLOWSHIELD
### *Urban Flood Simulation & Early Warning Crisis Command Dashboard*
#### **Guwahati Localization: Bahini / Bharalu Basin & GMDA GIS Drainage Ecosystem**

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Dark_Mode-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-Frame_Physics_State-orange)](https://github.com/pmndrs/zustand)
[![Recharts](https://img.shields.io/badge/Recharts-Realtime_Telemetry-22c55e)](https://recharts.org/)

**HYDRO-MATRIX / FLOWSHIELD** is an advanced crisis operations and hydrological simulation dashboard engineered for real-time disaster resilience in **Guwahati, Assam**. The platform is localized specifically to the complex **Bahini / Bharalu drainage basin** and integrates directly with the **Guwahati Metropolitan Development Authority (GMDA)** GIS-based drainage-planning ecosystem, supporting the Expression of Interest (EOI) for a GIS-based comprehensive drainage master plan and Detailed Project Report (DPR) for Guwahati.

It renders high-fidelity 2D/2.5D flood inundation dynamics at 60 FPS in the browser, integrates live telemetry feeds from **18 Automatic Weather Stations (AWS)** across the city, controls **20 GMDA auto-priming dewatering pump stations**, models the **Brahmaputra River outfall & Bharalumukh sluice gates**, and calculates predictive Time-to-Critical evacuation countdowns.

---

## 🏛️ System Architecture

```
flowshield/
├── app/
│   ├── layout.tsx                   # Command Center layout + UIContext Provider
│   ├── page.tsx                     # Physics engine loop driver (60 FPS / clock-scaled)
│   └── globals.css                  # Tactical dark grid, glassmorphic panels, glow filters
├── components/
│   ├── dashboard/
│   │   ├── Header.tsx               # DEFCON alert beacon, mission clock, GMDA Master Plan badge
│   │   ├── GMDAInfoModal.tsx        # GMDA GIS Drainage Planning & EOI Master Plan modal
│   │   ├── LeftDrawer.tsx           # Rainfall controls, 20 GMDA pumps toggles, failure disaster suite
│   │   ├── RightDrawer.tsx          # 18 AWS real-time feeds, Recharts discharge telemetry, watchlist
│   │   ├── ComparisonModal.tsx      # Multi-scenario behavioral matrix & comparative Recharts
│   │   ├── EvacuationAdvisor.tsx    # Civil defense routing & elevated shelter allocations
│   │   └── SitRepModal.tsx          # Printable Executive Situation Debrief Report (SitRep)
│   ├── map/
│   │   ├── FloodMap2D5.tsx          # 2.5D Volumetric Isometric & 2D GIS Top-Down Canvas
│   │   ├── MapControls.tsx          # Isometric switch, camera zoom/pan, AWS/Channel layer toggles
│   │   └── Legend.tsx               # 5 Primary channels, GMDA pumps, AWS stations & depth ramp
│   └── ui/                          # Radix/Shadcn-compatible dark-mode primitives
│       ├── button.tsx, badge.tsx, card.tsx, slider.tsx, switch.tsx, progress.tsx
├── context/
│   └── UIContext.tsx                # Drawer states, layer visibility, Web Audio synthesized sirens
├── hooks/
│   └── useFloodSimulation.ts        # Zustand Store: frame physics, 18 AWS feeds, 20 GMDA pumps
├── lib/
│   ├── simulation-engine/
│   │   ├── cityGrid.ts              # Guwahati basin grid: Bharalu, Bahini, Mora Bharalu, Basistha, Lakhimijan
│   │   ├── physics.ts               # 2D Diffusive Wave equations, Manning flow, GMDA pump extraction
│   │   └── scenarios.ts             # Calibrated Guwahati presets (Monsoon Baseline, Cloudburst, Pump Outage)
│   └── utils.ts                     # Class merge & digital formatting utilities
└── types/
    └── simulation.ts                # Strict TypeScript interfaces for geospatial simulation
```

---

## 🗺️ Guwahati Regional Topography & Drainage Channels

The simulation models an 18x18 discrete hydraulic grid (250m cell resolution, covering 4.5 km × 4.5 km of Guwahati's urban core) bounded by:
* **North:** Brahmaputra River receiving corridor (gauge elevation ~48.0m to 50.5m)
* **South:** Khasi Foothills & Basistha headwaters (elevation 75m - 90m)
* **West:** Nilachal (Kamakhya) Hills (elevation 142m) and Deepor Beel Ramsar wetland outflow
* **Center / East:** Urban depression bowls: Anil Nagar, Nabin Nagar, Zoo Road, Rukminigaon, Rajgarh, and Lachit Nagar (elevation 49.5m - 52.0m)

### 5 Government-Recognized Primary Drainage Channels:
1. **Bharalu (ভৰলু নদী):** Primary arterial canal carrying runoff from the urban core through Bharalumukh sluice outfall into the Brahmaputra River.
2. **Bahini (বাহিনী নৈ):** Upstream tributary originating in the southern Khasi foothills, flowing north through Beltola and Rukminigaon before becoming the Bharalu.
3. **Mora Bharalu (মৰা ভৰলু):** Historical overflow diversion channel routing surplus discharge westwards toward the Deepor Beel wetland system.
4. **Basistha (বশিষ্ঠ নদী):** Southern torrential stream draining high-velocity runoff from the Meghalaya/Khasi hills into the southeastern catchment.
5. **Lakhimijan (লখীমিজান):** Crucial inter-basin connector drain linking southern storm flows and inter-wetland corridors.

---

## 📡 Hardware & Telemetry Integration

### 18 Automatic Weather Stations (AWS):
The dashboard ingests and visualizes simulated real-time telemetry from all **18 AWS nodes** across Guwahati:
* Dispur Capital Complex, Jalukbari / Gauhati University, Borjhar / LGBI Airport
* Khanapara / Assam Agriculture Univ, Basistha Chariali Foothills, Panbazar / DC Office
* Chandmari / AEI Ground, Zoo Road / Tiniali, Ulubari / Paltan Bazar
* Bharalumukh Sluice Gate Station, Gotanagar / Maligaon, Noonmati / Refinery Colony
* Six Mile / VIP Road, Beltola Tiniali, Hatigaon High School
* Geetanagar / Mother Teresa Road, Deepor Beel Eco-Observatory, VIP Road / Chachal

Each station reports:
* Instantaneous Rainfall Intensity ($\text{mm/h}$)
* 24-Hour Accumulated Rainfall ($\text{mm}$)
* Relative Humidity ($\%$)
* Ambient Temperature ($\text{°C}$) & Barometric Pressure ($\text{hPa}$)
* Station Battery Health & Link Status

### 20 GMDA Auto-Priming Dewatering Pumps:
Full supervisory control and status monitoring over the **20 heavy-duty auto-priming pumps** deployed by GMDA at flood-vulnerable urban bowls:
* **Anil Nagar Bowls 1 & 2** (250 HP, $2.2\text{ m}^3/\text{s}$ each)
* **Nabin Nagar Drain Inlets 1 & 2** (250 HP, $2.2\text{ m}^3/\text{s}$ each)
* **Rukminigaon Sump 1 & 2** (180 HP, $1.5\text{ m}^3/\text{s}$ each)
* **Bharalumukh Outfall Lift 1 & 2** (300 HP, $3.0\text{ m}^3/\text{s}$ each)
* **Tarun Nagar Canal Station**, **Lachit Nagar Relief Pump**, **Rajgarh Road Culvert Pump**
* **Down Town / GS Road Sump**, **Sarusajai Basin Pump**, **Hatigaon Sijubari Pump**
* **Zoo Road / Tiniali Depressional Pump**, **Mathgharia / Noonmati Collector**
* **Mora Bharalu Inflow Diversion 1 & 2**, **Basistha Temple Bridge Sump**, **Lakhimijan Interceptor**

**Interactive Controls:**
* Per-pump interactive toggle switches in the Scenario & Controls drawer.
* Mass control actions: *Start All 20 Pumps* / *Stop All 20 Pumps*.
* One-click **Simulate Pump Failure Disaster**: Models instantaneous power blackout across all 20 GMDA dewatering stations.

---

## ⚡ Mathematical & Physical Modeling

The simulation engine implements a client-side **2D Shallow Water & Diffusive Wave approximation**:

### 1. Conservation of Mass (Continuity Equation)
$$\frac{\partial h}{\partial t} + \frac{\partial (uh)}{\partial x} + \frac{\partial (vh)}{\partial y} = R(t) - D_{\text{GMDA}}(t) - I(t)$$
* $h$: surface water depth $(m)$
* $u, v$: directional surface velocities $(m/s)$
* $R(t)$: atmospheric rainfall influx $(m/s)$ from AWS grid
* $D_{\text{GMDA}}(t)$: volumetric extraction rate from active GMDA auto-priming pumps $(m/s)$
* $I(t)$: soil infiltration modified by surface permeability $(m/s)$

### 2. Hydraulic Momentum & Gravity Gradient
Surface water flows down total hydraulic head:
$$H_i = z_{\text{bed}, i} + h_i + z_{\text{barrier}, i}$$
$$S_f = -\nabla H = -\frac{H_i - H_j}{\Delta x}$$

Inter-cell flux velocity is computed using **Manning's uniform flow equation**:
$$v_{ij} = \frac{1}{n} \cdot R_h^{2/3} \cdot |S_f|^{1/2} \cdot \operatorname{sign}(H_i - H_j)$$
* $n$: Manning's surface roughness ($0.025$ for paved channels, $0.050$ for urban residential)
* $R_h$: hydraulic radius, approximated as $\min(h_i, \Delta H_{ij})$

### 3. Brahmaputra Backwater & Sluice Gate Boundary
Discharge through the Bharalumukh outfall is constrained by Brahmaputra River stage:
* When Brahmaputra stage $< 49.5\text{m}$ and sluice gate is OPEN: gravity discharge occurs freely.
* When Brahmaputra stage $\ge 49.5\text{m}$: sluice gates close to prevent backflow into Bharalu basin, necessitating 100% mechanical dewatering via GMDA auto-priming pumps.

### 4. Dynamic Early Warning Predictive Classification
* **Safe**: $h < 0.25\text{m}$ (Translucent Emerald `#10b981`)
* **Warning**: $0.25\text{m} \le h < 0.75\text{m}$ (Luminous Amber `#f59e0b`)
* **Critical**: $h \ge 0.75\text{m}$ (Pulsing Crimson `#f43f5e`)

Time-to-Critical evacuation countdown:
$$\tau_{\text{crit}} = \frac{h_{\text{crit}} - h_t}{\frac{\Delta h}{\Delta t}} \quad [\text{in minutes}]$$

---

## 🎛️ Key Features

* **2.5D Volumetric Isometric & 2D GIS Orthographic Canvas**:
  Renders Guwahati elevation topography with shaded 3D depth walls and dynamic water inundation.
* **Animated Hydraulic Flow Vectors**:
  Directional vector arrows indicate runoff movement toward Bharalu channel and Deepor Beel wetland.
* **GMDA Master Plan & EOI Modal**:
  Dedicated overview modal detailing the technical alignment with GMDA's GIS-based comprehensive drainage master plan and DPR for Guwahati.
* **Time Travel Scrubber**:
  Step backward into past ponding or advance forward to preview inundation peak.
* **Disaster Injection Suite**:
  * *GMDA 20-Pump Grid Blackout*: Simulates citywide pump station power trip.
  * *Brahmaputra High Stage Sluice Lock*: Simulates river elevation exceeding 50.2m, locking Bharalumukh gates.
  * *Khasi Foothill Cloudburst*: 170 mm/h deluge pouring down Basistha/Bahini headwaters.
  * *Zoo Road Bahini-Bharalu Debris Choke*: Injects heavy silt and trash debris clogging canal culverts.
* **Emergency Evacuation Advisor**:
  Prioritizes vulnerable low-lying colonies (Anil Nagar, Nabin Nagar, Rukminigaon) with real-time routing to elevated shelters (Kamakhya Foothills, Dispur Capital Complex, Khanapara Pavilion).
* **Zero-Latency Tactical Audio Synthesizer**:
  Uses Web Audio API to produce crisis audio beacon tones when sectors breach critical DEFCON thresholds.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v18+ (tested on Node v20/v24)
* **npm**: v9+

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/skandakn/Hydro-Matrix.git
cd Hydro-Matrix

# Install dependencies
npm install

# Run development server
npm run dev

# Or compile and run optimized production build
npm run build
npm run start
```

Navigate to `http://localhost:3000` to open the crisis operations dashboard.

---

## 🧪 Technology Stack

* **Core Framework**: [Next.js 14](https://nextjs.org/) (App Router) + [React 18](https://react.dev/) + [TypeScript Strict Mode](https://www.typescriptlang.org/)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Frame-by-frame physics loop) + React Context (Theme & UI)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Glassmorphic Tactical Command Palette
* **Data Visualization**: [Recharts](https://recharts.org/) + HTML5 Retina Canvas
* **Icons**: [Lucide React](https://lucide.dev/)
