# StructPro — Structural Engineering Design Application

A browser-based 2D structural frame analysis and member design tool for structural engineers.

## Features

### Modelling
- Interactive SVG canvas with pan/zoom
- Place nodes (joints) with 1 m grid snapping
- Connect nodes with frame members (beams, columns, braces)
- Assign support conditions: Fixed, Pinned, Roller X, Roller Y, or Free
- Moment releases (pin connections) at member ends

### Materials & Sections
- **Steel** — 24 AISC W-shapes (W4 through W33)
- **Concrete** — 8 rectangular RC section presets
- Material properties: E = 200 GPa (steel), Ec = 4700√f'c MPa (concrete)

### Loads
- Point loads: Fx, Fy, Mz at any node
- Distributed loads: uniform or linearly varying (kN/m) along any member
- Four load cases: Dead (D), Live (L), Wind (W), Seismic (E)

### Analysis
- **Direct stiffness method** — 2D frame with 3 DOFs per node (dx, dy, rz)
- All **6 ASCE 7-22 LRFD** load combinations (1.4D through 0.9D+1.0E)
- Fixed-end force equivalents for distributed loads
- Gaussian elimination with partial pivoting
- Deformed shape overlay with adjustable scale

### Design Checks
- **AISC LRFD steel** — φMn, φVn, φPn checks (flexure, shear, axial)
- **ACI 318 concrete** — flexural and shear capacity (rectangular sections)
- Utilization ratio and colour-coded status per member

### Results
- Utilization envelope across all load combinations
- Per-combination: max deflection, max utilization, OK/NG status
- Node displacements (dx, dy, θz) and support reactions
- Member forces: N, V, M at both ends

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 — the app loads with a portal frame example.

## Stack

- React 19 + TypeScript (strict)
- Vite 8 + Tailwind CSS v4
- Pure TypeScript stiffness solver (no external math library)
- lucide-react icons

## Usage Tips

| Tool | Action |
|------|--------|
| **Select** | Click node or member to inspect/edit in sidebar |
| **Add Node** | Click canvas to place node (snaps to 1 m grid) |
| **Add Member** | Click start node then end node |
| **Delete** | Click any node or member to remove it |
| Scroll wheel | Zoom in/out |
| Alt + drag | Pan |

After modelling, click **Run Analysis** to compute all LRFD combinations.
Toggle **Deformed** shape in the toolbar and adjust the scale slider.
