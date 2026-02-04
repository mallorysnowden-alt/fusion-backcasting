"""Core LCOE calculation service."""

from backend.models import (
    Subsystem,
    FinancialParams,
    LCOEBreakdown,
    FuelType,
    get_fuel_constraints,
    ConfinementType,
    get_confinement_constraints,
)


def calculate_crf(wacc: float, lifetime: int) -> float:
    """
    Calculate Capital Recovery Factor.

    CRF = WACC * (1 + WACC)^n / ((1 + WACC)^n - 1)

    Args:
        wacc: Weighted average cost of capital (e.g., 0.08 for 8%)
        lifetime: Plant lifetime in years

    Returns:
        Capital recovery factor
    """
    if wacc <= 0:
        return 1 / lifetime
    numerator = wacc * (1 + wacc) ** lifetime
    denominator = (1 + wacc) ** lifetime - 1
    return numerator / denominator


def calculate_lcoe(
    subsystems: list[Subsystem],
    financial_params: FinancialParams,
    fuel_type: FuelType = FuelType.DT,
    confinement_type: ConfinementType = ConfinementType.MCF,
) -> LCOEBreakdown:
    """
    Calculate LCOE from subsystem and financial parameters.

    Formula: LCOE = (CRF × CapEx + O&M_fixed) / (CF × 8760) + O&M_variable + Fuel

    Args:
        subsystems: List of subsystems with their absolute costs
        financial_params: Financial parameters (WACC, lifetime, CF, capacity, etc.)
        fuel_type: Fuel type (affects CF and regulatory costs)
        confinement_type: Confinement approach (MCF or ICF)

    Returns:
        LCOEBreakdown with total and component contributions
    """
    # Get fuel constraints
    fuel_constraints = get_fuel_constraints(fuel_type)

    # Apply fuel-type capacity factor modifier
    effective_cf = financial_params.capacity_factor * fuel_constraints.cf_modifier

    # Calculate CRF
    crf = calculate_crf(financial_params.wacc, financial_params.lifetime)

    # Hours per year
    hours_per_year = 8760

    # Calculate energy production per kW installed (MWh/kW-yr)
    energy_per_kw = effective_cf * hours_per_year / 1000  # MWh per kW per year

    # Plant capacity in kW
    capacity_kw = financial_params.capacity_mw * 1000

    # Sum up costs from active subsystems (not disabled)
    total_capex = 0.0  # $/kW
    total_fixed_om = 0.0  # $/kW-yr
    total_variable_om = 0.0  # $/MWh

    subsystem_capital: dict[str, float] = {}
    subsystem_om: dict[str, float] = {}

    for sub in subsystems:
        if sub.disabled:
            continue

        # Convert absolute costs to $/kW
        capital_per_kw = sub.capital_cost_per_kw(financial_params.capacity_mw)
        fixed_om_per_kw = sub.fixed_om_per_kw(financial_params.capacity_mw)

        total_capex += capital_per_kw
        total_fixed_om += fixed_om_per_kw
        total_variable_om += sub.variable_om

        # Calculate per-subsystem contributions to LCOE
        sub_capital_contrib = (crf * capital_per_kw) / energy_per_kw
        sub_om_contrib = fixed_om_per_kw / energy_per_kw + sub.variable_om

        subsystem_capital[sub.account] = sub_capital_contrib
        subsystem_om[sub.account] = sub_om_contrib

    # Apply regulatory modifier to total capex (simplified)
    total_capex *= fuel_constraints.regulatory_modifier

    # Calculate LCOE components ($/MWh)
    capital_contribution = (crf * total_capex) / energy_per_kw
    fixed_om_contribution = total_fixed_om / energy_per_kw
    variable_om_contribution = total_variable_om
    fuel_contribution = 0.0  # Fusion fuel cost is negligible

    total_lcoe = (
        capital_contribution
        + fixed_om_contribution
        + variable_om_contribution
        + fuel_contribution
    )

    return LCOEBreakdown(
        capital_contribution=round(capital_contribution, 2),
        fixed_om_contribution=round(fixed_om_contribution, 2),
        variable_om_contribution=round(variable_om_contribution, 2),
        fuel_contribution=round(fuel_contribution, 2),
        total_lcoe=round(total_lcoe, 2),
        subsystem_capital={k: round(v, 2) for k, v in subsystem_capital.items()},
        subsystem_om={k: round(v, 2) for k, v in subsystem_om.items()},
    )


def get_feasibility_status(
    calculated_lcoe: float, target_lcoe: float
) -> tuple[str, str]:
    """
    Determine feasibility status based on calculated vs target LCOE.

    Args:
        calculated_lcoe: Calculated LCOE in $/MWh
        target_lcoe: Target LCOE in $/MWh

    Returns:
        Tuple of (status, description)
        - status: "green", "yellow", or "red"
        - description: Human-readable explanation
    """
    ratio = calculated_lcoe / target_lcoe if target_lcoe > 0 else float("inf")

    if ratio <= 1.0:
        return (
            "green",
            f"Target achieved! ${calculated_lcoe:.2f}/MWh ≤ ${target_lcoe:.2f}/MWh",
        )
    elif ratio <= 1.5:
        gap = calculated_lcoe - target_lcoe
        return (
            "yellow",
            f"Close to target. ${gap:.2f}/MWh gap to close ({(ratio-1)*100:.0f}% over)",
        )
    else:
        gap = calculated_lcoe - target_lcoe
        return (
            "red",
            f"Significant gap. ${gap:.2f}/MWh above target ({(ratio-1)*100:.0f}% over)",
        )
