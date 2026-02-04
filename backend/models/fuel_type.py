"""Fuel type enumeration and constraints."""

from enum import Enum
from pydantic import BaseModel
from typing import Optional


class FuelType(str, Enum):
    """Supported fusion fuel types."""
    DT = "D-T"
    DHE3 = "D-He3"
    PB11 = "p-B11"


class FuelConstraints(BaseModel):
    """Constraints imposed by fuel type selection."""
    required_subsystems: list[str]
    disabled_subsystems: list[str]
    cf_modifier: float  # Multiplier for capacity factor (e.g., 0.95 for -5%)
    regulatory_modifier: float  # Multiplier for regulatory costs
    description: str


# Define constraints for each fuel type
FUEL_CONSTRAINTS: dict[FuelType, FuelConstraints] = {
    FuelType.DT: FuelConstraints(
        required_subsystems=["22.5", "23"],  # Tritium handling, Turbine plant
        disabled_subsystems=["22.1.9", "22.6"],  # Direct energy conversion, He3 production
        cf_modifier=0.95,  # -5% CF due to neutron damage
        regulatory_modifier=1.20,  # +20% regulatory costs
        description="D-T fusion requires tritium breeding and thermal conversion. "
                    "High neutron flux causes material damage (-5% CF) and requires "
                    "additional regulatory compliance (+20% costs)."
    ),
    FuelType.DHE3: FuelConstraints(
        required_subsystems=["22.6", "23"],  # He3 production, Thermal conversion
        disabled_subsystems=["22.5"],  # No tritium handling needed
        cf_modifier=0.98,  # Less neutron damage
        regulatory_modifier=1.10,  # Moderate regulatory burden
        description="D-He3 fusion produces fewer neutrons, reducing material damage "
                    "and regulatory burden. Requires He3 production infrastructure."
    ),
    FuelType.PB11: FuelConstraints(
        required_subsystems=["22.1.9"],  # Direct energy conversion required
        disabled_subsystems=["22.5", "22.6", "23", "22.1.2"],  # No tritium, no He3, no thermal, no neutron shielding
        cf_modifier=1.0,  # No neutron damage
        regulatory_modifier=1.0,  # No special regulatory burden
        description="p-B11 is aneutronic, enabling direct energy conversion. "
                    "No tritium handling, He3 production, or neutron shielding needed. "
                    "Minimal regulatory burden, but requires much higher plasma temperatures."
    ),
}


def get_fuel_constraints(fuel_type: FuelType) -> FuelConstraints:
    """Get constraints for a given fuel type."""
    return FUEL_CONSTRAINTS[fuel_type]


class ConfinementConstraints(BaseModel):
    """Constraints imposed by confinement approach."""
    required_subsystems: list[str]
    disabled_subsystems: list[str]
    description: str


class ConfinementType(str, Enum):
    """Fusion confinement approaches."""
    MCF = "MCF"  # Magnetic Confinement Fusion
    ICF = "ICF"  # Inertial Confinement Fusion


CONFINEMENT_CONSTRAINTS: dict[ConfinementType, ConfinementConstraints] = {
    ConfinementType.MCF: ConfinementConstraints(
        required_subsystems=["22.1.3"],  # Magnets required
        disabled_subsystems=["22.1.8"],  # No laser driver
        description="Magnetic Confinement Fusion (tokamak, stellarator, etc.) "
                    "uses superconducting magnets to confine plasma."
    ),
    ConfinementType.ICF: ConfinementConstraints(
        required_subsystems=["22.1.8"],  # Laser/driver required
        disabled_subsystems=["22.1.3"],  # No magnets (simplified)
        description="Inertial Confinement Fusion uses lasers or other drivers "
                    "to compress and heat fuel pellets."
    ),
}


def get_confinement_constraints(confinement_type: ConfinementType) -> ConfinementConstraints:
    """Get constraints for a given confinement approach."""
    return CONFINEMENT_CONSTRAINTS[confinement_type]
