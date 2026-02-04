"""LCOE calculation endpoints."""

import json
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.models import (
    Subsystem,
    SubsystemInput,
    FinancialParams,
    LCOEBreakdown,
    FuelType,
    get_fuel_constraints,
    ConfinementType,
    get_confinement_constraints,
    CONFINEMENT_CONSTRAINTS,
)
from backend.services import calculate_lcoe, analyze_feasibility

router = APIRouter(prefix="/api/lcoe", tags=["lcoe"])


class LCOERequest(BaseModel):
    """Request body for LCOE calculation."""

    target_lcoe: float = Field(default=10.0, ge=1.0, le=100.0)
    fuel_type: FuelType = Field(default=FuelType.DT)
    confinement_type: ConfinementType = Field(default=ConfinementType.MCF)
    subsystems: list[SubsystemInput] = Field(default_factory=list)
    financial_params: FinancialParams = Field(default_factory=FinancialParams)


class LCOEResponse(BaseModel):
    """Response from LCOE calculation."""

    calculated_lcoe: float
    target_lcoe: float
    breakdown: LCOEBreakdown
    feasibility: dict
    total_capex_abs: float  # Total absolute capex in $M
    total_capex_per_kw: float  # Total capex in $/kW


def load_default_subsystems() -> list[Subsystem]:
    """Load default subsystems from JSON file."""
    data_path = Path(__file__).parent.parent / "data" / "default_subsystems.json"
    with open(data_path) as f:
        data = json.load(f)
    return [Subsystem(**s, required=False, disabled=False) for s in data["subsystems"]]


def apply_constraints(
    subsystems: list[Subsystem],
    fuel_type: FuelType,
    confinement_type: ConfinementType,
) -> list[Subsystem]:
    """Apply fuel type and confinement constraints to subsystems."""
    fuel_constraints = get_fuel_constraints(fuel_type)
    confinement_constraints = get_confinement_constraints(confinement_type)

    # Combine constraints
    required = set(fuel_constraints.required_subsystems) | set(confinement_constraints.required_subsystems)
    disabled = set(fuel_constraints.disabled_subsystems) | set(confinement_constraints.disabled_subsystems)

    result = []
    for sub in subsystems:
        sub_dict = sub.model_dump()
        sub_dict["required"] = sub.account in required
        sub_dict["disabled"] = sub.account in disabled
        result.append(Subsystem(**sub_dict))

    return result


@router.post("/calculate", response_model=LCOEResponse)
async def calculate_lcoe_endpoint(request: LCOERequest) -> LCOEResponse:
    """
    Calculate LCOE from subsystem and financial parameters.

    If no subsystems provided, uses defaults with fuel/confinement constraints applied.
    """
    # Load defaults or use provided subsystems
    if not request.subsystems:
        subsystems = load_default_subsystems()
    else:
        # Merge provided inputs with defaults
        defaults = {s.account: s for s in load_default_subsystems()}
        subsystems = []
        for inp in request.subsystems:
            if inp.account in defaults:
                base = defaults[inp.account].model_dump()
                base.update(inp.model_dump())
                subsystems.append(Subsystem(**base))

    # Apply fuel type and confinement constraints
    subsystems = apply_constraints(subsystems, request.fuel_type, request.confinement_type)

    # Calculate LCOE
    breakdown = calculate_lcoe(
        subsystems=subsystems,
        financial_params=request.financial_params,
        fuel_type=request.fuel_type,
        confinement_type=request.confinement_type,
    )

    # Calculate totals for display
    total_capex_abs = sum(s.absolute_capital_cost for s in subsystems if not s.disabled)
    total_capex_per_kw = sum(
        s.capital_cost_per_kw(request.financial_params.capacity_mw)
        for s in subsystems if not s.disabled
    )

    # Analyze feasibility
    feasibility_report = analyze_feasibility(
        calculated_lcoe=breakdown.total_lcoe,
        target_lcoe=request.target_lcoe,
        subsystems=subsystems,
        capacity_factor=request.financial_params.capacity_factor,
        wacc=request.financial_params.wacc,
        fuel_type=request.fuel_type,
    )

    return LCOEResponse(
        calculated_lcoe=breakdown.total_lcoe,
        target_lcoe=request.target_lcoe,
        breakdown=breakdown,
        feasibility=feasibility_report.to_dict(),
        total_capex_abs=round(total_capex_abs, 1),
        total_capex_per_kw=round(total_capex_per_kw, 0),
    )


@router.get("/defaults")
async def get_defaults(
    fuel_type: FuelType = FuelType.DT,
    confinement_type: ConfinementType = ConfinementType.MCF,
) -> dict:
    """
    Get default subsystems with fuel type and confinement constraints applied.
    """
    subsystems = load_default_subsystems()
    subsystems = apply_constraints(subsystems, fuel_type, confinement_type)

    return {
        "subsystems": [s.model_dump() for s in subsystems],
        "financial_params": FinancialParams().model_dump(),
        "fuel_type": fuel_type.value,
        "confinement_type": confinement_type.value,
    }


@router.get("/fuel/{fuel_type}/constraints")
async def get_fuel_constraints_endpoint(fuel_type: FuelType) -> dict:
    """
    Get constraints for a specific fuel type.
    """
    constraints = get_fuel_constraints(fuel_type)
    return {
        "fuel_type": fuel_type.value,
        "required_subsystems": constraints.required_subsystems,
        "disabled_subsystems": constraints.disabled_subsystems,
        "cf_modifier": constraints.cf_modifier,
        "regulatory_modifier": constraints.regulatory_modifier,
        "description": constraints.description,
    }


@router.get("/confinement/{confinement_type}/constraints")
async def get_confinement_constraints_endpoint(confinement_type: ConfinementType) -> dict:
    """
    Get constraints for a specific confinement approach.
    """
    constraints = get_confinement_constraints(confinement_type)
    return {
        "confinement_type": confinement_type.value,
        "required_subsystems": constraints.required_subsystems,
        "disabled_subsystems": constraints.disabled_subsystems,
        "description": constraints.description,
    }


@router.get("/fuel-types")
async def list_fuel_types() -> dict:
    """List all available fuel types with their constraints."""
    return {
        "fuel_types": [
            {
                "id": ft.value,
                "name": ft.value,
                **get_fuel_constraints(ft).model_dump(),
            }
            for ft in FuelType
        ]
    }


@router.get("/confinement-types")
async def list_confinement_types() -> dict:
    """List all available confinement approaches with their constraints."""
    return {
        "confinement_types": [
            {
                "id": ct.value,
                "name": ct.value,
                **get_confinement_constraints(ct).model_dump(),
            }
            for ct in ConfinementType
        ]
    }
