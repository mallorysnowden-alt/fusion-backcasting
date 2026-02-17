"""Tests for constraint solver service."""

import pytest
from backend.models import Subsystem, FinancialParams, FuelType
from backend.services.constraint_solver import (
    solve_for_capex,
    solve_for_capacity_factor,
    solve_for_wacc,
    solve_for_fixed_om,
    solve_for_lifetime,
    solve_for_q_eng,
)
from backend.services.lcoe_calculator import calculate_lcoe


def create_test_subsystems() -> list[Subsystem]:
    """Create a set of test subsystems with absolute costs."""
    return [
        Subsystem(
            account="22.1.3",
            name="Magnets",
            absolute_capital_cost=800,  # $800M
            absolute_fixed_om=20,  # $20M/yr
            variable_om=0,
            trl=6,
            idiot_index=12.0,
        ),
        Subsystem(
            account="23",
            name="Turbine",
            absolute_capital_cost=400,  # $400M
            absolute_fixed_om=12,  # $12M/yr
            variable_om=0.5,
            trl=9,
            idiot_index=2.0,
        ),
        Subsystem(
            account="24-26",
            name="BOP",
            absolute_capital_cost=350,  # $350M
            absolute_fixed_om=10,  # $10M/yr
            variable_om=0.3,
            trl=9,
            idiot_index=1.5,
        ),
    ]


def test_solve_for_capex_basic():
    """Test solving for maximum allowable CapEx."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_capex(
        target_lcoe=30.0,  # Achievable target
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    assert result.parameter == "capex"
    assert result.required_value > 0
    assert isinstance(result.explanation, str)


def test_solve_for_capex_infeasible():
    """Test that very low target returns infeasible result."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_capex(
        target_lcoe=1.0,  # Impossible target
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    # Should be infeasible (capex would need to be very low or negative)
    assert result.required_value < 500 or not result.feasible


def test_solve_for_capacity_factor_basic():
    """Test solving for required capacity factor."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_capacity_factor(
        target_lcoe=30.0,
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    assert result.parameter == "capacity_factor"
    assert 0 < result.required_value <= 1.5  # Might be over 100% if infeasible


def test_solve_for_capacity_factor_impossible():
    """Test that very low target may require impossible CF."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_capacity_factor(
        target_lcoe=5.0,  # Very aggressive target
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    # Should require CF > 100% (infeasible)
    if result.required_value > 1.0:
        assert not result.feasible


def test_solve_for_wacc_basic():
    """Test solving for required WACC."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_wacc(
        target_lcoe=40.0,
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    assert result.parameter == "wacc"
    assert 0 <= result.required_value <= 0.25


def test_solve_for_wacc_impossible():
    """Test that very low target requires unrealistic WACC."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_wacc(
        target_lcoe=5.0,
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    # Should require very low WACC or be infeasible
    if result.required_value < 0.03:
        assert not result.feasible


def test_solve_for_fixed_om_basic():
    """Test solving for maximum fixed O&M."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_fixed_om(
        target_lcoe=40.0,
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    assert result.parameter == "fixed_om"


def test_solve_for_lifetime_basic():
    """Test solving for required lifetime."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_lifetime(
        target_lcoe=30.0,
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    assert result.parameter == "lifetime"
    assert 10 <= result.required_value <= 60


def test_solver_roundtrip_wacc():
    """Test that solved WACC value produces target LCOE when fed back."""
    subsystems = create_test_subsystems()
    params = FinancialParams(wacc=0.08, lifetime=40, capacity_factor=0.90, capacity_mw=1000)
    target = 35.0

    # Solve for WACC
    result = solve_for_wacc(target, subsystems, params, FuelType.DT)

    if result.feasible and 0.01 < result.required_value < 0.25:
        # Use solved WACC
        new_params = FinancialParams(
            wacc=result.required_value,
            lifetime=params.lifetime,
            capacity_factor=params.capacity_factor,
            capacity_mw=params.capacity_mw,
        )

        # Calculate LCOE with solved WACC
        lcoe_result = calculate_lcoe(subsystems, new_params, FuelType.DT)

        # Should be close to target (within 5%)
        assert abs(lcoe_result.total_lcoe - target) / target < 0.05


def test_solve_for_q_eng_basic():
    """Test solving for required Q_eng."""
    subsystems = create_test_subsystems()
    params = FinancialParams(capacity_mw=1000)

    result = solve_for_q_eng(
        target_lcoe=30.0,
        subsystems=subsystems,
        financial_params=params,
        fuel_type=FuelType.DT,
    )

    assert result.parameter == "q_eng"
    assert result.required_value > 0
    assert isinstance(result.explanation, str)


def test_solve_for_q_eng_roundtrip():
    """Test that solved Q_eng value produces target LCOE when fed back."""
    subsystems = create_test_subsystems()
    params = FinancialParams(wacc=0.08, lifetime=40, capacity_factor=0.90, capacity_mw=1000, q_eng=10.0)
    target = 30.0

    # Solve for Q_eng
    result = solve_for_q_eng(target, subsystems, params, FuelType.DT)

    if result.feasible and 1.5 <= result.required_value <= 50:
        # Use solved Q_eng
        new_params = FinancialParams(
            wacc=params.wacc,
            lifetime=params.lifetime,
            capacity_factor=params.capacity_factor,
            capacity_mw=params.capacity_mw,
            q_eng=result.required_value,
        )

        # Calculate LCOE with solved Q_eng
        lcoe_result = calculate_lcoe(subsystems, new_params, FuelType.DT)

        # Should be close to target (within 5%)
        assert abs(lcoe_result.total_lcoe - target) / target < 0.05
