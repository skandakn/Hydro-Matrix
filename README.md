# 🌊 HYDRO-MATRIX: FLOWSHIELD
### *Urban Flood Simulation & Early Warning Crisis Command Dashboard*

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Dark_Mode-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-Frame_Physics_State-orange)](https://github.com/pmndrs/zustand)
[![Recharts](https://img.shields.io/badge/Recharts-Realtime_Telemetry-22c55e)](https://recharts.org/)

**HYDRO-MATRIX / FLOWSHIELD** is a high-stakes emergency operations and hydrological simulation dashboard built for real-time disaster resilience. It bridges the gap between academic hydraulic modeling and frontline crisis response, rendering high-fidelity flood inundation dynamics at 60 FPS in the browser while calculating predictive early-warning evacuation countdowns.

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
│   │   ├── Header.tsx               # DEFCON alert beacon, mission clock, quick actions
│   │   ├── LeftDrawer.tsx           # Rainfall slider, calibrated presets, disaster suite, timeline scrubber
│   │   ├── RightDrawer.tsx          # Live telemetry KPIs, Recharts telemetry, critical watchlist
│   │   ├── ComparisonModal.tsx      # Multi-scenario behavioral matrix & comparative Recharts
│   │   ├── EvacuationAdvisor.tsx    # Civil defense routing & designated shelter allocations
│   │   └── SitRepModal.tsx          # Printable Executive Situation Debrief Report (SitRep)
│   ├── map/
│   │   ├── FloodMap2D5.tsx          # 2.5D Volumetric Isometric & 2D GIS Top-Down Canvas
│   │   ├── MapControls.tsx          # Isometric switch, camera zoom/pan, layer visibility
│   │   └── Legend.tsx               # Depth color ramp & infrastructure iconography
│   └── ui/                          # Radix/Shadcn-compatible dark-mode primitives
│       ├── button.tsx, badge.tsx, card.tsx, slider.tsx, switch.tsx, progress.tsx
├── context/
│   └── UIContext.tsx                # Drawer states, layer visibility, Web Audio synthesized sirens
├── hooks/
│   └── useFloodSimulation.ts        # Zustand Store: frame-by-frame loop, time travel history
├── lib/
│   ├── simulation-engine/
│   │   ├── cityGrid.ts              # Procedural metropolitan basin, river, critical infrastructure
│   │   ├── physics.ts               # 2D Diffusive Wave equations, Manning flow, Time-to-Critical
│   │   └── scenarios.ts             # Calibrated crisis presets (Monsoon, Cloudburst, Surge, etc.)
│   └── utils.ts                     # Class merge & digital formatting utilities
└── types/
    └── simulation.ts                # Strict TypeScript interfaces for geospatial simulation
```

---

## ⚡ Core Mathematical & Physical Modeling

The simulation engine implements a client-side **2D Shallow Water & Diffusive Wave approximation**:

### 1. Conservation of Mass (Continuity Equation)
$$\frac{\partial h}{\partial t} + \frac{\partial (uh)}{\partial x} + \frac{\partial (vh)}{\partial y} = R(t) - D(t) - I(t)$$
* $h$: surface water depth $(m)$
* $u, v$: directional surface velocities $(m/s)$
* $R(t)$: atmospheric rainfall influx $(m/s)$
* $D(t)$: engineered municipal pump discharge $(m/s)$
* $I(t)$: soil infiltration modified by surface permeability $(m/s)$

### 2. Hydraulic Momentum & Open-Channel Gradient
Surface water flows from high total hydraulic head to low hydraulic head:
$$H_i = z_{\text{bed}, i} + h_i + z_{\text{barrier}, i}$$
$$S_f = -\nabla H = -\frac{H_i - H_j}{\Delta x}$$

Inter-cell flux velocity is governed by **Manning's uniform flow equation**:
$$v_{ij} = \frac{1}{n} \cdot R_h^{2/3} \cdot |S_f|^{1/2} \cdot \operatorname{sign}(H_i - H_j)$$
* $n$: Manning's surface roughness coefficient ($0.035 - 0.050$)
* $R_h$: hydraulic radius, approximated as $\min(h_i, \Delta H_{ij})$

### 3. Numerical Stability (CFL Flux Limiter)
To guarantee numerical stability and volume conservation without matrix divergence, outbound flux per timestep is capped:
$$\sum Q_{\text{out}} \cdot \Delta t \le 0.45 \cdot h_i \cdot A_{\text{cell}}$$

### 4. Dynamic Early Warning Predictive Classification
* **Safe**: $h < 0.25\text{m}$ (Translucent Emerald `#10b981`)
* **Warning**: $0.25\text{m} \le h < 0.75\text{m}$ (Luminous Amber `#f59e0b`)
* **Critical**: $h \ge 0.75\text{m}$ (Pulsing Crimson `#f43f5e`)

For any sector approaching the critical threshold under active accumulation:
$$\tau_{\text{crit}} = \frac{h_{\text{crit}} - h_t}{\frac{\Delta h}{\Delta t}} \quad [\text{in minutes}]$$

---

## 🎛️ Key Features

* **2.5D Volumetric Isometric Viewport**:
  Renders terrain elevation columns with 3D shaded depth walls and rising volumetric water layers. Toggles seamlessly to 2D GIS top-down orthographic view.
* **Animated Hydraulic Flow Vectors**:
  Real-time directional vectors dynamically sized to flow speed and gradient slope.
* **Time Travel Scrubber (Bidirectional Scrubbing)**:
  Full snapshot buffer enables incident commanders to scrub backward into past ponding or step forward into peak inundation.
* **Disaster Injection Suite**:
  * *Model Drainage Failure*: Simulates power blackout knocking out 80% of municipal pumps.
  * *Simulate Blocked Drainage Channel*: Injects a debris dam at the primary canal culvert to trigger backwater surges.
  * *Cloudburst Spike*: Injects an instant 180 mm/h convective deluge.
  * *Coastal Storm Surge*: Simulates a +1.4m tidal surge resisting ocean discharge.
* **Scenario Comparison Matrix**:
  Multi-line Recharts curves comparing flooded land area, population exposure, and time to first breach across 5 scenarios.
* **Emergency Evacuation Advisor**:
  Highlights designated elevated shelter havens and lists sectors prioritized by Time-to-Critical countdowns.
* **Zero-Latency Tactical Audio Synthesizer**:
  Uses Web Audio API to generate synthetic command-center siren tones during critical breach events without external asset dependencies.

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
