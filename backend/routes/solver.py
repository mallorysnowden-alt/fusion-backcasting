"""Constraint solver endpoints."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from backend.models import (
    Subsystem,
    SubsystemInput,
    FinancialParams,
    FuelType,
    get_fuel_constraints,
    ConfinementType,
    get_confinement_constraints,
)
from backend.services import (
    solve_for_capex,
    solve_for_capacity_factor,
    solve_for_wacc,
    solve_for_fixed_om,
    solve_for_lifetime,
)

router = APIRouter(prefix="/api/solver", tags=["solver"])


class SolverRequest(BaseModel):
    """Request body for solver endpoints."""

    target_lcoe: float = Field(default=10.0, ge=1.0, le=100.0)
    fuel_type: FuelType = Field(default=FuelType.DT)
    confinement_type: ConfinementType = Field(default=ConfinementType.MCF)
    subsystems: list[SubsystemInput] = Field(default_factory=list)
    financial_params: FinancialParams = Field(default_factory=FinancialParams)


class SolverResponse(BaseModel):
    """Response from solver endpoint."""

    parameter: str
    required_value: float
    feasible: bool
    explanation: str
    constraints: dict = Field(default_factory=dict)


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

    required = set(fuel_constraints.required_subsystems) | set(confinement_constraints.required_subsystems)
    disabled = set(fuel_constraints.disabled_subsystems) | set(confinement_constraints.disabled_subsystems)

    result = []
    for sub in subsystems:
        sub_dict = sub.model_dump()
        sub_dict["required"] = sub.account in required
        sub_dict["disabled"] = sub.account in disabled
        result.append(Subsystem(**sub_dict))

    return result


def prepare_subsystems(
    inputs: list[SubsystemInput],
    fuel_type: FuelType,
    confinement_type: ConfinementType,
) -> list[Subsystem]:
    """Prepare subsystems from inputs, applying defaults and constraints."""
    if not inputs:
        subsystems = load_default_subsystems()
    else:
        defaults = {s.account: s for s in load_default_subsystems()}
        subsystems = []
        for inp in inputs:
            if inp.account in defaults:
                base = defaults[inp.account].model_dump()
                base.update(inp.model_dump())
                subsystems.append(Subsystem(**base))

    return apply_constraints(subsystems, fuel_type, confinement_type)


SolveParameter = Literal["capex", "capacity_factor", "wacc", "fixed_om", "lifetime"]


@router.post("/solve-for/{parameter}", response_model=SolverResponse)
async def solve_for_parameter(
    parameter: SolveParameter, request: SolverRequest
) -> SolverResponse:
    """
    Solve for a specific parameter to hit target LCOE.

    Parameters:
    - capex: Maximum allowable capital cost (returns $M)
    - capacity_factor: Required capacity factor
    - wacc: Required financing rate
    - fixed_om: Maximum allowable fixed O&M (returns $M/yr)
    - lifetime: Required plant lifetime
    """
    subsystems = prepare_subsystems(
        request.subsystems, request.fuel_type, request.confinement_type
    )

    solvers = {
        "capex": solve_for_capex,
        "capacity_factor": solve_for_capacity_factor,
        "wacc": solve_for_wacc,
        "fixed_om": solve_for_fixed_om,
        "lifetime": solve_for_lifetime,
    }

    if parameter not in solvers:
        raise HTTPException(
            status_code=400, detail=f"Unknown parameter: {parameter}"
        )

    result = solvers[parameter](
        target_lcoe=request.target_lcoe,
        subsystems=subsystems,
        financial_params=request.financial_params,
        fuel_type=request.fuel_type,
    )

    return SolverResponse(**result.to_dict())


@router.post("/solve-all")
async def solve_all(request: SolverRequest) -> dict:
    """
    Solve for all parameters simultaneously.

    Returns required values for each parameter to hit target LCOE.
    """
    subsystems = prepare_subsystems(
        request.subsystems, request.fuel_type, request.confinement_type
    )

    results = {}
    for param, solver in [
        ("capex", solve_for_capex),
        ("capacity_factor", solve_for_capacity_factor),
        ("wacc", solve_for_wacc),
        ("fixed_om", solve_for_fixed_om),
        ("lifetime", solve_for_lifetime),
    ]:
        result = solver(
            target_lcoe=request.target_lcoe,
            subsystems=subsystems,
            financial_params=request.financial_params,
            fuel_type=request.fuel_type,
        )
        results[param] = result.to_dict()

    return {"target_lcoe": request.target_lcoe, "solutions": results}
