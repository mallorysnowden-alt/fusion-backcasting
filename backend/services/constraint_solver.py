"""Constraint solver for "Solve for X" inverse calculations."""

from typing import Optional
from backend.models import (
    Subsystem,
    FinancialParams,
    FuelType,
    get_fuel_constraints,
    ConfinementType,
)
from backend.services.lcoe_calculator import calculate_crf, q_eng_multiplier


class SolverResult:
    """Result from constraint solver."""

    def __init__(
        self,
        parameter: str,
        required_value: float,
        feasible: bool,
        explanation: str,
        constraints: Optional[dict] = None,
    ):
        self.parameter = parameter
        self.required_value = required_value
        self.feasible = feasible
        self.explanation = explanation
        self.constraints = constraints or {}

    def to_dict(self) -> dict:
        return {
            "parameter": self.parameter,
            "required_value": self.required_value,
            "feasible": self.feasible,
            "explanation": self.explanation,
            "constraints": self.constraints,
        }


def solve_for_capex(
    target_lcoe: float,
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
) -> SolverResult:
    """
    Solve for maximum allowable CapEx to hit target LCOE.
    Returns the result in absolute terms ($M) for a given plant capacity.
    """
    fuel_constraints = get_fuel_constraints(fuel_type)
    effective_cf = financial_params.capacity_factor * fuel_constraints.cf_modifier
    crf = calculate_crf(financial_params.wacc, financial_params.lifetime)
    energy_per_kw = effective_cf * 8760 / 1000  # MWh per kW per year

    # Sum O&M from active subsystems (converted to $/kW, with Q_eng scaling)
    total_fixed_om = sum(
        s.fixed_om_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_variable_om = sum(s.variable_om for s in subsystems if not s.disabled)

    # Current capex for reference ($/kW, with Q_eng scaling)
    current_capex_per_kw = sum(
        s.capital_cost_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    current_capex_per_kw *= fuel_constraints.regulatory_modifier

    # Current absolute capex ($M, with Q_eng scaling)
    current_capex_abs = sum(
        s.absolute_capital_cost * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )

    # Solve for capex ($/kW)
    max_capex_with_reg = (
        (target_lcoe - total_variable_om) * energy_per_kw - total_fixed_om
    ) / crf

    # Remove regulatory modifier to get base capex
    max_capex_per_kw = max_capex_with_reg / fuel_constraints.regulatory_modifier

    # Convert to absolute ($M)
    max_capex_abs = max_capex_per_kw * financial_params.capacity_mw * 1000 / 1e6

    feasible = max_capex_abs > 0 and max_capex_abs >= current_capex_abs * 0.3

    if max_capex_abs <= 0:
        explanation = f"Impossible: O&M alone exceeds target LCOE of ${target_lcoe}/MWh"
    elif max_capex_per_kw < 500:
        explanation = f"To hit ${target_lcoe}/MWh, total CapEx must be ≤ ${max_capex_abs:.0f}M (${max_capex_per_kw:.0f}/kW) - very aggressive"
    else:
        explanation = f"To hit ${target_lcoe}/MWh, total CapEx must be ≤ ${max_capex_abs:.0f}M (${max_capex_per_kw:.0f}/kW)"

    return SolverResult(
        parameter="capex",
        required_value=round(max_capex_abs, 0),
        feasible=feasible,
        explanation=explanation,
        constraints={
            "current_capex_abs": round(current_capex_abs, 0),
            "current_capex_per_kw": round(current_capex_per_kw, 0),
            "max_capex_per_kw": round(max_capex_per_kw, 0),
            "reduction_needed_abs": round(current_capex_abs - max_capex_abs, 0),
        },
    )


def solve_for_capacity_factor(
    target_lcoe: float,
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
) -> SolverResult:
    """
    Solve for required capacity factor to hit target LCOE.
    """
    fuel_constraints = get_fuel_constraints(fuel_type)
    crf = calculate_crf(financial_params.wacc, financial_params.lifetime)

    # Sum costs from active subsystems (converted to $/kW, with Q_eng scaling)
    total_capex = sum(
        s.capital_cost_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_capex *= fuel_constraints.regulatory_modifier
    total_fixed_om = sum(
        s.fixed_om_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_variable_om = sum(s.variable_om for s in subsystems if not s.disabled)

    # Solve for CF
    denominator = (target_lcoe - total_variable_om) * 8760 / 1000
    if denominator <= 0:
        return SolverResult(
            parameter="capacity_factor",
            required_value=float("inf"),
            feasible=False,
            explanation=f"Impossible: Variable O&M (${total_variable_om}/MWh) exceeds target LCOE",
        )

    required_cf_base = (crf * total_capex + total_fixed_om) / denominator

    # Account for fuel-type CF modifier
    required_cf = required_cf_base / fuel_constraints.cf_modifier

    feasible = 0.5 <= required_cf <= 0.98

    if required_cf > 1.0:
        explanation = f"Need {required_cf*100:.0f}% CF (impossible - max is 100%)"
    elif required_cf > 0.95:
        explanation = f"Need {required_cf*100:.1f}% CF (very aggressive - best plants achieve ~95%)"
    elif required_cf < 0.5:
        explanation = f"Need only {required_cf*100:.0f}% CF (easily achievable)"
    else:
        explanation = f"Need {required_cf*100:.1f}% CF to hit ${target_lcoe}/MWh"

    return SolverResult(
        parameter="capacity_factor",
        required_value=round(required_cf, 3),
        feasible=feasible,
        explanation=explanation,
        constraints={"current_cf": financial_params.capacity_factor},
    )


def solve_for_wacc(
    target_lcoe: float,
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
) -> SolverResult:
    """
    Solve for required WACC to hit target LCOE.
    Uses numerical bisection since CRF is non-linear in WACC.
    """
    fuel_constraints = get_fuel_constraints(fuel_type)
    effective_cf = financial_params.capacity_factor * fuel_constraints.cf_modifier
    energy_per_kw = effective_cf * 8760 / 1000

    # Sum costs from active subsystems (converted to $/kW, with Q_eng scaling)
    total_capex = sum(
        s.capital_cost_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_capex *= fuel_constraints.regulatory_modifier
    total_fixed_om = sum(
        s.fixed_om_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_variable_om = sum(s.variable_om for s in subsystems if not s.disabled)

    # Function to minimize
    def lcoe_at_wacc(wacc: float) -> float:
        crf = calculate_crf(wacc, financial_params.lifetime)
        return (crf * total_capex + total_fixed_om) / energy_per_kw + total_variable_om

    # Check bounds
    lcoe_at_1pct = lcoe_at_wacc(0.01)
    lcoe_at_25pct = lcoe_at_wacc(0.25)

    if lcoe_at_1pct > target_lcoe:
        return SolverResult(
            parameter="wacc",
            required_value=0,
            feasible=False,
            explanation=f"Even at 1% WACC, LCOE is ${lcoe_at_1pct:.1f}/MWh (above ${target_lcoe}/MWh target)",
        )

    if lcoe_at_25pct < target_lcoe:
        return SolverResult(
            parameter="wacc",
            required_value=0.25,
            feasible=True,
            explanation=f"Target achievable even at 25% WACC",
        )

    # Bisection search
    low, high = 0.01, 0.25
    for _ in range(50):
        mid = (low + high) / 2
        lcoe_mid = lcoe_at_wacc(mid)
        if abs(lcoe_mid - target_lcoe) < 0.01:
            break
        if lcoe_mid > target_lcoe:
            high = mid
        else:
            low = mid

    required_wacc = mid
    feasible = required_wacc >= 0.03

    if required_wacc < 0.03:
        explanation = f"Need {required_wacc*100:.1f}% WACC (below typical project finance rates)"
    elif required_wacc < 0.06:
        explanation = f"Need {required_wacc*100:.1f}% WACC (requires favorable financing)"
    else:
        explanation = f"Need {required_wacc*100:.1f}% WACC to hit ${target_lcoe}/MWh"

    return SolverResult(
        parameter="wacc",
        required_value=round(required_wacc, 3),
        feasible=feasible,
        explanation=explanation,
        constraints={"current_wacc": financial_params.wacc},
    )


def solve_for_fixed_om(
    target_lcoe: float,
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
) -> SolverResult:
    """
    Solve for maximum allowable fixed O&M to hit target LCOE.
    Returns result in absolute terms ($M/yr).
    """
    fuel_constraints = get_fuel_constraints(fuel_type)
    effective_cf = financial_params.capacity_factor * fuel_constraints.cf_modifier
    crf = calculate_crf(financial_params.wacc, financial_params.lifetime)
    energy_per_kw = effective_cf * 8760 / 1000

    # Sum costs from active subsystems (converted to $/kW, with Q_eng scaling)
    total_capex = sum(
        s.capital_cost_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_capex *= fuel_constraints.regulatory_modifier
    current_fixed_om_per_kw = sum(
        s.fixed_om_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    current_fixed_om_abs = sum(
        s.absolute_fixed_om * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_variable_om = sum(s.variable_om for s in subsystems if not s.disabled)

    # Solve for fixed O&M ($/kW-yr)
    max_fixed_om_per_kw = (target_lcoe - total_variable_om) * energy_per_kw - crf * total_capex

    # Convert to absolute ($M/yr)
    max_fixed_om_abs = max_fixed_om_per_kw * financial_params.capacity_mw * 1000 / 1e6

    feasible = max_fixed_om_abs > 0 and max_fixed_om_abs >= current_fixed_om_abs * 0.3

    if max_fixed_om_abs <= 0:
        explanation = f"Impossible: Capital costs alone exceed target LCOE of ${target_lcoe}/MWh"
    elif max_fixed_om_per_kw < 20:
        explanation = f"Fixed O&M must be < ${max_fixed_om_abs:.0f}M/yr (${max_fixed_om_per_kw:.0f}/kW-yr) - very aggressive"
    else:
        explanation = f"Fixed O&M must be < ${max_fixed_om_abs:.0f}M/yr (${max_fixed_om_per_kw:.0f}/kW-yr) to hit ${target_lcoe}/MWh"

    return SolverResult(
        parameter="fixed_om",
        required_value=round(max_fixed_om_abs, 0),
        feasible=feasible,
        explanation=explanation,
        constraints={
            "current_fixed_om_abs": round(current_fixed_om_abs, 0),
            "current_fixed_om_per_kw": round(current_fixed_om_per_kw, 0),
            "max_fixed_om_per_kw": round(max_fixed_om_per_kw, 0),
        },
    )


def solve_for_lifetime(
    target_lcoe: float,
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
) -> SolverResult:
    """
    Solve for required plant lifetime to hit target LCOE.
    Uses numerical bisection since CRF is non-linear in lifetime.
    """
    fuel_constraints = get_fuel_constraints(fuel_type)
    effective_cf = financial_params.capacity_factor * fuel_constraints.cf_modifier
    energy_per_kw = effective_cf * 8760 / 1000

    # Sum costs from active subsystems (converted to $/kW, with Q_eng scaling)
    total_capex = sum(
        s.capital_cost_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_capex *= fuel_constraints.regulatory_modifier
    total_fixed_om = sum(
        s.fixed_om_per_kw(financial_params.capacity_mw) * q_eng_multiplier(s.account, financial_params.q_eng)
        for s in subsystems if not s.disabled
    )
    total_variable_om = sum(s.variable_om for s in subsystems if not s.disabled)

    # Function to minimize
    def lcoe_at_lifetime(lifetime: int) -> float:
        crf = calculate_crf(financial_params.wacc, lifetime)
        return (crf * total_capex + total_fixed_om) / energy_per_kw + total_variable_om

    # Check bounds
    lcoe_at_60yr = lcoe_at_lifetime(60)
    lcoe_at_10yr = lcoe_at_lifetime(10)

    if lcoe_at_60yr > target_lcoe:
        return SolverResult(
            parameter="lifetime",
            required_value=60,
            feasible=False,
            explanation=f"Even at 60-year lifetime, LCOE is ${lcoe_at_60yr:.1f}/MWh (above ${target_lcoe}/MWh target)",
        )

    if lcoe_at_10yr < target_lcoe:
        return SolverResult(
            parameter="lifetime",
            required_value=10,
            feasible=True,
            explanation=f"Target achievable even with 10-year lifetime",
        )

    # Bisection search
    low, high = 10, 60
    for _ in range(20):
        mid = (low + high) // 2
        lcoe_mid = lcoe_at_lifetime(mid)
        if abs(lcoe_mid - target_lcoe) < 0.1:
            break
        if lcoe_mid > target_lcoe:
            low = mid
        else:
            high = mid

    required_lifetime = mid
    feasible = required_lifetime <= 50

    if required_lifetime > 50:
        explanation = f"Need {required_lifetime}-year lifetime (beyond typical plant life)"
    elif required_lifetime > 40:
        explanation = f"Need {required_lifetime}-year lifetime (achievable with life extension)"
    else:
        explanation = f"Need {required_lifetime}-year lifetime to hit ${target_lcoe}/MWh"

    return SolverResult(
        parameter="lifetime",
        required_value=required_lifetime,
        feasible=feasible,
        explanation=explanation,
        constraints={"current_lifetime": financial_params.lifetime},
    )


def solve_for_q_eng(
    target_lcoe: float,
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
) -> SolverResult:
    """
    Solve for required Q_eng to hit target LCOE.

    Separates costs into Q-scaling (reactor island, turbine) and non-Q-scaling (BOP).
    Q/(Q-1) = (A - C_nq) / C_q  where A = LCOE headroom, C_q/C_nq = Q/non-Q cost rates.
    Then Q = R / (R - 1) where R = (A - C_nq) / C_q.
    """
    from backend.services.lcoe_calculator import Q_SCALING_FACTORS

    fuel_constraints = get_fuel_constraints(fuel_type)
    effective_cf = financial_params.capacity_factor * fuel_constraints.cf_modifier
    crf = calculate_crf(financial_params.wacc, financial_params.lifetime)
    energy_per_kw = effective_cf * 8760 / 1000

    active = [s for s in subsystems if not s.disabled]
    total_variable_om = sum(s.variable_om for s in active)

    # Separate Q-scaling and non-Q-scaling costs
    capex_q = 0.0
    capex_no_q = 0.0
    om_q = 0.0
    om_no_q = 0.0

    for s in active:
        cap_kw = s.capital_cost_per_kw(financial_params.capacity_mw)
        om_kw = s.fixed_om_per_kw(financial_params.capacity_mw)
        scaling_flag = Q_SCALING_FACTORS.get(s.account, 0.0)
        if scaling_flag > 0:
            capex_q += cap_kw
            om_q += om_kw
        else:
            capex_no_q += cap_kw
            om_no_q += om_kw

    c_q = crf * capex_q * fuel_constraints.regulatory_modifier + om_q
    c_nq = crf * capex_no_q * fuel_constraints.regulatory_modifier + om_no_q
    a = (target_lcoe - total_variable_om) * energy_per_kw

    if a <= c_nq:
        return SolverResult(
            parameter="q_eng",
            required_value=float("inf"),
            feasible=False,
            explanation=f"Impossible: non-Q costs alone exceed target ${target_lcoe}/MWh",
        )

    if c_q <= 0:
        return SolverResult(
            parameter="q_eng",
            required_value=1.5,
            feasible=True,
            explanation="No Q-scaling costs active — any Q_eng achieves target",
        )

    r = (a - c_nq) / c_q  # R = Q/(Q-1)

    if r <= 1:
        return SolverResult(
            parameter="q_eng",
            required_value=float("inf"),
            feasible=False,
            explanation=f"Impossible: Q-scaling costs too high for target ${target_lcoe}/MWh",
        )

    required_q = r / (r - 1)
    feasible = 1.5 <= required_q <= 50

    if required_q < 1.5:
        explanation = f"Need Q_eng = {required_q:.1f} (below physical minimum ~1.5)"
    elif required_q > 50:
        explanation = f"Need Q_eng > 50 — easily achievable"
    elif required_q > 20:
        explanation = f"Need Q_eng >= {required_q:.1f} (achievable for mature designs)"
    elif required_q > 5:
        explanation = f"Need Q_eng >= {required_q:.1f} ({100/required_q:.0f}% recirculated)"
    else:
        explanation = f"Need Q_eng >= {required_q:.1f} (high recirculating power, {100/required_q:.0f}% recirculated)"

    plant_size_factor = required_q / (required_q - 1)

    return SolverResult(
        parameter="q_eng",
        required_value=round(required_q, 1),
        feasible=feasible,
        explanation=explanation,
        constraints={
            "current_q_eng": financial_params.q_eng,
            "plant_size_factor": round(plant_size_factor, 2),
        },
    )
