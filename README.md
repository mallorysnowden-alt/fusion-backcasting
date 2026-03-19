# Fusion Backcasting

Explore what needs to be true for fusion to produce electricity at a target LCOE.

Unlike traditional LCOE calculators that compute costs from inputs, this tool treats **target LCOE as the binding constraint** and helps you explore what parameter combinations could achieve it. Set your target electricity cost, then adjust subsystem costs, learning rates, and financial parameters to understand what's required.

## Key Changes from Master Branch

- **More reactor types**: Added confinement/fuel type combinations that use cost multipliers to the D-T/Tokamak "baseline" as a stand-in for physics-driven models
- **Q_eng parameter**: User-defined net engineering energy gain (Q_eng = P_gross / P_recirc) incorporated into the LCOE calculation, with per-account Q scaling (reactor/turbine costs scale, BOP does not). Includes power balance info box showing P_fus, P_net, P_gross, P_recirc, and reference Q values for ITER, ARC/SPARC, commercial, and fission
- **Target LCOE as binding constraint**: The calculated LCOE always equals the target LCOE unless it's unattainable, in which case the minimum possible LCOE is displayed beneath
- **User-set deployed units**: The user sets the number of deployed units; learning rates and costs are optimized to meet the target LCOE
- **LP-based optimization**: Uses linear programming to minimize the number of cost accounts that must violate their TRL-derived feasibility threshold while ensuring total CAPEX meets the target LCOE requirement
  - If the target can be met with zero violations: green flag
  - If violations are required: red flag, and the displayed "min achievable LCOE" is the value obtained when forcing all accounts to their learning rate thresholds
- **Anti-learning for high target LCOE**: When target LCOE exceeds baseline, learning rates can exceed 100% (costs increase), weighted toward low-TRL technologies first
- **O&M as % of CapEx**: O&M cost displayed as a percentage of CapEx below cost boxes
- **UI reorganization**: Removed baseline cost sliders (display-only computed costs), removed old SolveForButtons/FeasibilityIndicator components, moved fuel/confinement selectors to top row, capital breakdown chart moved below LCOE display

## Quick Start

### Backend

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Start server
uvicorn backend.main:app --reload
```

The API will be available at http://localhost:8000

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The UI will be available at http://localhost:5173

## Key Features

### Absolute Cost Model
Subsystem costs are set in **absolute terms ($M)** to reveal non-linear scaling effects. The $/kW values are calculated based on plant capacity and displayed for reference.

### Fuel Types
- **D-T**: Requires tritium handling, thermal conversion. -5% CF, +20% regulatory
- **D-He3**: Requires He3 production, thermal conversion. -2% CF, +10% regulatory
- **p-B11**: Aneutronic - requires direct energy conversion. No neutron shielding needed. No penalties

### Confinement Approaches
- **MCF** (Magnetic Confinement): Requires magnets
- **ICF** (Inertial Confinement): Requires laser/driver

### "Solve for X" Constraint Solver
Answers questions like:
- "What CapEx do I need to hit $10/MWh?"
- "What capacity factor is required?"
- "What financing rate (WACC) would make this work?"

## Reference

Based on the [ARPA-E Fusion Cost Code (FCC)](https://arxiv.org/abs/2601.21724) Account 22+ framework.

## API Endpoints

- `POST /api/lcoe/calculate` - Calculate LCOE from parameters
- `GET /api/lcoe/defaults` - Get default subsystems and parameters
- `GET /api/lcoe/fuel-types` - List available fuel types
- `GET /api/lcoe/confinement-types` - List confinement approaches
- `POST /api/solver/solve-for/{parameter}` - Solve for a parameter to hit target LCOE
- `POST /api/solver/solve-all` - Solve for all parameters

## Project Structure

```
onecent_fusion/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── models/
│   │   ├── fuel_type.py           # Fuel + confinement constraints
│   │   └── subsystem.py           # Subsystem data model
│   ├── services/
│   │   ├── lcoe_calculator.py     # Core LCOE calculation
│   │   ├── constraint_solver.py   # "Solve for X" inverse calc
│   │   └── feasibility.py         # Feasibility indicators
│   ├── routes/
│   │   ├── lcoe.py                # Calculation endpoints
│   │   └── solver.py              # Solver endpoints
│   └── data/
│       └── default_subsystems.json # ARPA-E FCC structure
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── store/index.ts         # Zustand state
│   │   ├── components/            # React components
│   │   └── utils/calculations.ts  # Client-side LCOE calc
│   └── package.json
└── tests/                         # Backend tests
```

## License

MIT
