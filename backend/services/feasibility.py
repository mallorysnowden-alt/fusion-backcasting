"""Feasibility analysis service."""

from dataclasses import dataclass
from typing import Optional
from backend.models import Subsystem, FuelType


@dataclass
class FeasibilityCheck:
    """Result of a single feasibility check."""

    category: str
    status: str  # "pass", "warning", "fail"
    message: str
    details: Optional[str] = None


@dataclass
class FeasibilityReport:
    """Complete feasibility analysis report."""

    overall_status: str  # "green", "yellow", "red"
    lcoe_status: str
    lcoe_message: str
    checks: list[FeasibilityCheck]

    def to_dict(self) -> dict:
        return {
            "overall_status": self.overall_status,
            "lcoe_status": self.lcoe_status,
            "lcoe_message": self.lcoe_message,
            "checks": [
                {
                    "category": c.category,
                    "status": c.status,
                    "message": c.message,
                    "details": c.details,
                }
                for c in self.checks
            ],
        }


def check_trl_feasibility(subsystems: list[Subsystem]) -> FeasibilityCheck:
    """Check if subsystem TRLs are realistic for near-term deployment."""
    low_trl_systems = [s for s in subsystems if not s.disabled and s.trl < 5]

    if not low_trl_systems:
        return FeasibilityCheck(
            category="Technology Readiness",
            status="pass",
            message="All active subsystems at TRL 5+",
        )
    elif len(low_trl_systems) <= 2:
        names = ", ".join(s.name for s in low_trl_systems)
        return FeasibilityCheck(
            category="Technology Readiness",
            status="warning",
            message=f"{len(low_trl_systems)} subsystem(s) at low TRL: {names}",
            details="Low TRL components may require significant R&D investment",
        )
    else:
        names = ", ".join(s.name for s in low_trl_systems)
        return FeasibilityCheck(
            category="Technology Readiness",
            status="fail",
            message=f"Many low-TRL subsystems: {names}",
            details="High technology risk - multiple unproven components",
        )


def check_idiot_index_realism(subsystems: list[Subsystem]) -> FeasibilityCheck:
    """Check if cost assumptions are realistic given idiot indices."""
    # Check for subsystems with high idiot index but low cost (optimistic)
    optimistic = []
    for s in subsystems:
        if s.disabled:
            continue
        # High idiot index means high learning potential - costs should be higher initially
        if s.idiot_index > 8 and s.trl < 6:
            optimistic.append(s)

    if not optimistic:
        return FeasibilityCheck(
            category="Cost Realism",
            status="pass",
            message="Cost assumptions consistent with technology maturity",
        )
    elif len(optimistic) <= 2:
        names = ", ".join(s.name for s in optimistic)
        return FeasibilityCheck(
            category="Cost Realism",
            status="warning",
            message=f"Optimistic costs for: {names}",
            details="High idiot index + low TRL suggests significant cost learning required",
        )
    else:
        return FeasibilityCheck(
            category="Cost Realism",
            status="fail",
            message="Multiple subsystems have optimistic cost assumptions",
            details="Consider using higher initial costs for low-TRL, high-idiot-index systems",
        )


def check_capacity_factor(cf: float, fuel_type: FuelType) -> FeasibilityCheck:
    """Check if capacity factor is realistic."""
    if fuel_type == FuelType.DT:
        max_realistic = 0.92  # Neutron damage limits
    else:
        max_realistic = 0.95

    if cf <= max_realistic:
        return FeasibilityCheck(
            category="Capacity Factor",
            status="pass",
            message=f"{cf*100:.0f}% CF is achievable for {fuel_type.value}",
        )
    elif cf <= 0.98:
        return FeasibilityCheck(
            category="Capacity Factor",
            status="warning",
            message=f"{cf*100:.0f}% CF is aggressive for {fuel_type.value}",
            details=f"Best existing plants achieve ~{max_realistic*100:.0f}%",
        )
    else:
        return FeasibilityCheck(
            category="Capacity Factor",
            status="fail",
            message=f"{cf*100:.0f}% CF is unrealistic",
            details="No power plant operates at >98% capacity factor long-term",
        )


def check_wacc(wacc: float) -> FeasibilityCheck:
    """Check if WACC assumption is realistic."""
    if wacc >= 0.06:
        return FeasibilityCheck(
            category="Financing",
            status="pass",
            message=f"{wacc*100:.1f}% WACC is achievable",
        )
    elif wacc >= 0.04:
        return FeasibilityCheck(
            category="Financing",
            status="warning",
            message=f"{wacc*100:.1f}% WACC requires favorable financing",
            details="May need government backing or concessional finance",
        )
    else:
        return FeasibilityCheck(
            category="Financing",
            status="fail",
            message=f"{wacc*100:.1f}% WACC is unrealistic",
            details="Below sovereign borrowing rates in most countries",
        )


def analyze_feasibility(
    calculated_lcoe: float,
    target_lcoe: float,
    subsystems: list[Subsystem],
    capacity_factor: float,
    wacc: float,
    fuel_type: FuelType,
) -> FeasibilityReport:
    """
    Perform comprehensive feasibility analysis.

    Args:
        calculated_lcoe: Calculated LCOE in $/MWh
        target_lcoe: Target LCOE in $/MWh
        subsystems: List of subsystems
        capacity_factor: Assumed capacity factor
        wacc: Weighted average cost of capital
        fuel_type: Fuel type

    Returns:
        FeasibilityReport with overall status and individual checks
    """
    # LCOE status
    ratio = calculated_lcoe / target_lcoe if target_lcoe > 0 else float("inf")

    if ratio <= 1.0:
        lcoe_status = "green"
        lcoe_message = f"Target achieved: ${calculated_lcoe:.2f}/MWh ≤ ${target_lcoe:.2f}/MWh"
    elif ratio <= 1.5:
        lcoe_status = "yellow"
        lcoe_message = f"Close: ${calculated_lcoe:.2f}/MWh ({(ratio-1)*100:.0f}% over target)"
    else:
        lcoe_status = "red"
        lcoe_message = f"Gap: ${calculated_lcoe:.2f}/MWh ({(ratio-1)*100:.0f}% over target)"

    # Run all checks
    checks = [
        check_trl_feasibility(subsystems),
        check_idiot_index_realism(subsystems),
        check_capacity_factor(capacity_factor, fuel_type),
        check_wacc(wacc),
    ]

    # Determine overall status
    statuses = [c.status for c in checks] + [lcoe_status]
    if "red" in statuses or any(s == "fail" for s in statuses):
        overall_status = "red"
    elif "yellow" in statuses or any(s == "warning" for s in statuses):
        overall_status = "yellow"
    else:
        overall_status = "green"

    return FeasibilityReport(
        overall_status=overall_status,
        lcoe_status=lcoe_status,
        lcoe_message=lcoe_message,
        checks=checks,
    )
