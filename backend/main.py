"""FastAPI entry point for 1cent Fusion LCOE calculator."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import lcoe_router, solver_router

app = FastAPI(
    title="1cent Fusion",
    description="Intuition pump for exploring fusion electricity at $0.01/kWh LCOE",
    version="0.1.0",
)

# Configure CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(lcoe_router)
app.include_router(solver_router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "1cent Fusion API",
        "version": "0.1.0",
        "description": "Explore fusion electricity at $0.01/kWh ($10/MWh) LCOE",
        "endpoints": {
            "calculate": "POST /api/lcoe/calculate",
            "defaults": "GET /api/lcoe/defaults",
            "fuel_constraints": "GET /api/lcoe/fuel/{fuel_type}/constraints",
            "fuel_types": "GET /api/lcoe/fuel-types",
            "solve_for": "POST /api/solver/solve-for/{parameter}",
            "solve_all": "POST /api/solver/solve-all",
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
