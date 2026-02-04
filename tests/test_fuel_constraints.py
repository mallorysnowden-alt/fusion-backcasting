"""Tests for fuel type and confinement constraints."""

import pytest
from backend.models import (
    FuelType,
    get_fuel_constraints,
    ConfinementType,
    get_confinement_constraints,
)


def test_dt_constraints():
    """Test D-T fuel constraints."""
    constraints = get_fuel_constraints(FuelType.DT)

    # D-T requires tritium handling and turbine plant
    assert "22.5" in constraints.required_subsystems  # Tritium handling
    assert "23" in constraints.required_subsystems  # Turbine plant

    # D-T disables direct energy conversion and He3 production
    assert "22.1.9" in constraints.disabled_subsystems
    assert "22.6" in constraints.disabled_subsystems

    # D-T has CF penalty
    assert constraints.cf_modifier < 1.0

    # D-T has regulatory cost increase
    assert constraints.regulatory_modifier > 1.0


def test_dhe3_constraints():
    """Test D-He3 fuel constraints."""
    constraints = get_fuel_constraints(FuelType.DHE3)

    # D-He3 requires He3 production and thermal conversion
    assert "22.6" in constraints.required_subsystems  # He3 production
    assert "23" in constraints.required_subsystems  # Turbine

    # D-He3 disables tritium handling
    assert "22.5" in constraints.disabled_subsystems

    # D-He3 has smaller penalties than D-T
    assert constraints.cf_modifier >= 0.95
    assert constraints.regulatory_modifier <= 1.15


def test_pb11_constraints():
    """Test p-B11 (aneutronic) fuel constraints."""
    constraints = get_fuel_constraints(FuelType.PB11)

    # p-B11 requires direct energy conversion
    assert "22.1.9" in constraints.required_subsystems

    # p-B11 disables tritium, He3, thermal, and neutron shielding
    assert "22.5" in constraints.disabled_subsystems  # No tritium
    assert "22.6" in constraints.disabled_subsystems  # No He3
    assert "23" in constraints.disabled_subsystems  # No thermal turbine
    assert "22.1.2" in constraints.disabled_subsystems  # No neutron shielding

    # p-B11 has no CF or regulatory penalties
    assert constraints.cf_modifier == 1.0
    assert constraints.regulatory_modifier == 1.0


def test_mcf_constraints():
    """Test Magnetic Confinement constraints."""
    constraints = get_confinement_constraints(ConfinementType.MCF)

    # MCF requires magnets
    assert "22.1.3" in constraints.required_subsystems

    # MCF disables laser driver
    assert "22.1.8" in constraints.disabled_subsystems


def test_icf_constraints():
    """Test Inertial Confinement constraints."""
    constraints = get_confinement_constraints(ConfinementType.ICF)

    # ICF requires laser driver
    assert "22.1.8" in constraints.required_subsystems

    # ICF disables magnets
    assert "22.1.3" in constraints.disabled_subsystems


def test_all_fuel_types_have_constraints():
    """Test that all fuel types have defined constraints."""
    for fuel_type in FuelType:
        constraints = get_fuel_constraints(fuel_type)
        assert constraints is not None
        assert isinstance(constraints.required_subsystems, list)
        assert isinstance(constraints.disabled_subsystems, list)
        assert 0 < constraints.cf_modifier <= 1.0
        assert constraints.regulatory_modifier >= 1.0


def test_all_confinement_types_have_constraints():
    """Test that all confinement types have defined constraints."""
    for conf_type in ConfinementType:
        constraints = get_confinement_constraints(conf_type)
        assert constraints is not None
        assert isinstance(constraints.required_subsystems, list)
        assert isinstance(constraints.disabled_subsystems, list)


def test_no_subsystem_both_required_and_disabled():
    """Test that no subsystem is both required and disabled for any fuel type."""
    for fuel_type in FuelType:
        constraints = get_fuel_constraints(fuel_type)
        required_set = set(constraints.required_subsystems)
        disabled_set = set(constraints.disabled_subsystems)

        # No overlap allowed
        assert required_set.isdisjoint(disabled_set), (
            f"{fuel_type} has subsystems that are both required and disabled: "
            f"{required_set & disabled_set}"
        )


def test_no_subsystem_both_required_and_disabled_confinement():
    """Test that no subsystem is both required and disabled for any confinement type."""
    for conf_type in ConfinementType:
        constraints = get_confinement_constraints(conf_type)
        required_set = set(constraints.required_subsystems)
        disabled_set = set(constraints.disabled_subsystems)

        # No overlap allowed
        assert required_set.isdisjoint(disabled_set), (
            f"{conf_type} has subsystems that are both required and disabled: "
            f"{required_set & disabled_set}"
        )
