"""Routes package."""

from .lcoe import router as lcoe_router
from .solver import router as solver_router

__all__ = ["lcoe_router", "solver_router"]
