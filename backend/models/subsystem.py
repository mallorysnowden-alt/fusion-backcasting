"""Subsystem data model following ARPA-E FCC Account 22+ structure."""

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class ConfinementType(str, Enum):
    """Fusion confinement approaches."""
    MCF = "MCF"  # Magnetic Confinement Fusion
    ICF = "ICF"  # Inertial Confinement Fusion


class Subsystem(BaseModel):
    """A fusion power plant subsystem with cost and technology attributes."""

    account: str = Field(..., description="FCC account number (e.g., '22.1.1')")
    name: str = Field(..., description="Subsystem name")
    # Absolute costs - these are what users adjust
    absolute_capital_cost: float = Field(..., ge=0, description="Absolute capital cost in $M")
    absolute_fixed_om: float = Field(default=0, ge=0, description="Absolute fixed O&M in $M/yr")
    variable_om: float = Field(default=0, ge=0, description="Variable O&M in $/MWh")
    trl: int = Field(..., ge=1, le=9, description="Technology Readiness Level (1-9)")
    idiot_index: float = Field(
        default=1.0,
        ge=1.0,
        description="Ratio of cost to raw materials cost - indicates learning potential"
    )
    required: bool = Field(default=False, description="Whether required by current fuel/confinement type")
    disabled: bool = Field(default=False, description="Whether disabled by current fuel/confinement type")
    description: Optional[str] = Field(default=None, description="Subsystem description")

    def capital_cost_per_kw(self, capacity_mw: float) -> float:
        """Calculate capital cost in $/kW based on plant capacity."""
        if capacity_mw <= 0:
            return 0
        return (self.absolute_capital_cost * 1e6) / (capacity_mw * 1000)

    def fixed_om_per_kw(self, capacity_mw: float) -> float:
        """Calculate fixed O&M in $/kW-yr based on plant capacity."""
        if capacity_mw <= 0:
            return 0
        return (self.absolute_fixed_om * 1e6) / (capacity_mw * 1000)

    @property
    def learning_potential(self) -> str:
        """Interpret idiot index as learning potential category."""
        if self.idiot_index <= 2:
            return "limited"  # Commodity
        elif self.idiot_index <= 5:
            return "some"  # Mature industrial
        elif self.idiot_index <= 10:
            return "significant"  # Complex systems
        else:
            return "massive"  # High-tech


class SubsystemInput(BaseModel):
    """Input model for subsystem parameters (subset of editable fields)."""

    account: str
    absolute_capital_cost: float = Field(..., ge=0, description="Absolute capital cost in $M")
    absolute_fixed_om: float = Field(default=0, ge=0, description="Absolute fixed O&M in $M/yr")
    variable_om: float = Field(default=0, ge=0)


class FinancialParams(BaseModel):
    """Financial parameters for LCOE calculation."""

    wacc: float = Field(
        default=0.08,
        ge=0.01,
        le=0.25,
        description="Weighted average cost of capital"
    )
    lifetime: int = Field(
        default=40,
        ge=10,
        le=60,
        description="Plant lifetime in years"
    )
    capacity_factor: float = Field(
        default=0.90,
        ge=0.5,
        le=1.0,
        description="Capacity factor (0-1)"
    )
    capacity_mw: float = Field(
        default=1000,
        ge=100,
        le=5000,
        description="Plant capacity in MW"
    )
    construction_time: int = Field(
        default=5,
        ge=2,
        le=15,
        description="Construction time in years"
    )
    q_eng: float = Field(
        default=10.0,
        gt=1.0,
        le=50.0,
        description="Engineering energy gain Q_eng = P_gross / P_recirc"
    )


class LCOEBreakdown(BaseModel):
    """Breakdown of LCOE components."""

    capital_contribution: float = Field(..., description="$/MWh from capital costs")
    fixed_om_contribution: float = Field(..., description="$/MWh from fixed O&M")
    variable_om_contribution: float = Field(..., description="$/MWh from variable O&M")
    fuel_contribution: float = Field(default=0, description="$/MWh from fuel costs")
    total_lcoe: float = Field(..., description="Total LCOE in $/MWh")

    # Detailed breakdown by subsystem
    subsystem_capital: dict[str, float] = Field(
        default_factory=dict,
        description="Capital cost contribution by subsystem account"
    )
    subsystem_om: dict[str, float] = Field(
        default_factory=dict,
        description="O&M contribution by subsystem account"
    )
