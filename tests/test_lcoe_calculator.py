"""Tests for LCOE calculator service."""

import pytest
from backend.models import Subsystem, FinancialParams, FuelType
from backend.services.lcoe_calculator import calculate_crf, calculate_lcoe, get_feasibility_status


def test_calculate_crf_typical_values():
    """Test CRF calculation with typical values."""
    # 8% WACC, 40 year lifetime
    crf = calculate_crf(0.08, 40)
    # CRF should be around 8.4%
    assert 0.08 < crf < 0.09


def test_calculate_crf_zero_wacc():
    """Test CRF with zero WACC (simple payback)."""
    crf = calculate_crf(0, 40)
    assert crf == pytest.approx(1 / 40)


def test_calculate_crf_short_lifetime():
    """Test CRF with short lifetime increases value."""
    crf_long = calculate_crf(0.08, 40)
    crf_short = calculate_crf(0.08, 20)
    assert crf_short > crf_long


def create_test_subsystems() -> list[Subsystem]:
    """Create a minimal set of test subsystems with absolute costs."""
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
    ]


def test_calculate_lcoe_basic():
    """Test basic LCOE calculation."""
    subsystems = create_test_subsystems()
    params = FinancialParams(
        wacc=0.08,
        lifetime=40,
        capacity_factor=0.90,
        capacity_mw=1000,
    )

    result = calculate_lcoe(subsystems, params, FuelType.DT)

    # LCOE should be positive
    assert result.total_lcoe > 0

    # Components should sum to total
    component_sum = (
        result.capital_contribution
        + result.fixed_om_contribution
        + result.variable_om_contribution
        + result.fuel_contribution
    )
    assert component_sum == pytest.approx(result.total_lcoe, rel=0.01)


def test_calculate_lcoe_disabled_subsystems():
    """Test that disabled subsystems don't contribute to LCOE."""
    subsystems = [
        Subsystem(
            account="22.1.3",
            name="Magnets",
            absolute_capital_cost=800,
            absolute_fixed_om=20,
            variable_om=0,
            trl=6,
            idiot_index=12.0,
            disabled=False,
        ),
        Subsystem(
            account="22.5",
            name="Tritium",
            absolute_capital_cost=500,
            absolute_fixed_om=15,
            variable_om=0,
            trl=5,
            idiot_index=10.0,
            disabled=True,  # Disabled
        ),
    ]
    params = FinancialParams()

    result = calculate_lcoe(subsystems, params, FuelType.DT)

    # Disabled subsystem should not be in breakdown
    assert "22.5" not in result.subsystem_capital


def test_get_feasibility_status_green():
    """Test green status when below target."""
    status, message = get_feasibility_status(8.0, 10.0)
    assert status == "green"
    assert "achieved" in message.lower()


def test_get_feasibility_status_yellow():
    """Test yellow status when within 50% of target."""
    status, message = get_feasibility_status(12.0, 10.0)
    assert status == "yellow"
    assert "close" in message.lower()


def test_get_feasibility_status_red():
    """Test red status when more than 50% over target."""
    status, message = get_feasibility_status(20.0, 10.0)
    assert status == "red"
    assert "gap" in message.lower()


def test_lcoe_increases_with_capex():
    """Test that LCOE increases with higher capital costs."""
    params = FinancialParams(capacity_mw=1000)

    low_capex = [
        Subsystem(
            account="22.1.1",
            name="Test",
            absolute_capital_cost=100,  # $100M
            absolute_fixed_om=5,
            variable_om=0,
            trl=7,
            idiot_index=2.0
        )
    ]
    high_capex = [
        Subsystem(
            account="22.1.1",
            name="Test",
            absolute_capital_cost=1000,  # $1000M
            absolute_fixed_om=5,
            variable_om=0,
            trl=7,
            idiot_index=2.0
        )
    ]

    result_low = calculate_lcoe(low_capex, params, FuelType.DT)
    result_high = calculate_lcoe(high_capex, params, FuelType.DT)

    assert result_high.total_lcoe > result_low.total_lcoe


def test_lcoe_decreases_with_capacity_factor():
    """Test that LCOE decreases with higher capacity factor."""
    subsystems = create_test_subsystems()

    low_cf = FinancialParams(capacity_factor=0.60, capacity_mw=1000)
    high_cf = FinancialParams(capacity_factor=0.95, capacity_mw=1000)

    result_low = calculate_lcoe(subsystems, low_cf, FuelType.DT)
    result_high = calculate_lcoe(subsystems, high_cf, FuelType.DT)

    assert result_low.total_lcoe > result_high.total_lcoe


def test_lcoe_changes_with_plant_capacity():
    """Test that $/kW changes with plant capacity for same absolute cost."""
    subsystems = [
        Subsystem(
            account="22.1.1",
            name="Test",
            absolute_capital_cost=500,  # $500M fixed
            absolute_fixed_om=10,
            variable_om=0,
            trl=7,
            idiot_index=2.0
        )
    ]

    # Same absolute cost, different plant capacities
    small_plant = FinancialParams(capacity_mw=500, capacity_factor=0.90)
    large_plant = FinancialParams(capacity_mw=1000, capacity_factor=0.90)

    result_small = calculate_lcoe(subsystems, small_plant, FuelType.DT)
    result_large = calculate_lcoe(subsystems, large_plant, FuelType.DT)

    # Smaller plant should have higher LCOE (same cost spread over less capacity)
    assert result_small.total_lcoe > result_large.total_lcoe
