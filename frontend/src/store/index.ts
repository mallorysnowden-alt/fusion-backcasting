import { create } from 'zustand';
import {
  Subsystem,
  FinancialParams,
  FuelType,
  ConfinementType,
  LCOEBreakdown,
  FeasibilityResult,
  calculateLCOE,
  calculateCRF,
  getFeasibilityStatus,
  capitalCostPerKw,
  getEffectiveMultiplier,
  getPlausibleLRRange,
  FUEL_INFO,
} from '../utils/calculations';

// Default subsystems with absolute costs ($M for 1000 MW reference)
// Learning rates based on technology maturity:
// - TRL 9 (mature): 0.95 (5% reduction per doubling)
// - TRL 7-8: 0.90 (10% reduction per doubling)
// - TRL 5-6: 0.85 (15% reduction per doubling)
// - TRL 3-4: 0.80 (20% reduction per doubling)
const DEFAULT_SUBSYSTEMS: Subsystem[] = [
  {
    account: '22.1.1',
    name: 'First Wall/Blanket',
    absoluteCapitalCost: 500,
    absoluteFixedOm: 25,
    variableOm: 0,
    trl: 4,
    baselineIdiotIndex: 8.5,
    baselineCapitalCost: 500,
    baselineFixedOm: 25,
    learningRate: 0.80,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Plasma-facing components and breeding blanket. High neutron flux environment requires advanced materials.',
  },
  {
    account: '22.1.2',
    name: 'Neutron Shielding',
    absoluteCapitalCost: 200,
    absoluteFixedOm: 5,
    variableOm: 0,
    trl: 5,
    baselineIdiotIndex: 3.0,
    baselineCapitalCost: 200,
    baselineFixedOm: 5,
    learningRate: 0.85,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Radiation shielding to protect external components and personnel. Not needed for aneutronic fuels.',
  },
  {
    account: '22.1.3',
    name: 'Magnets (MCF)',
    absoluteCapitalCost: 800,
    absoluteFixedOm: 20,
    variableOm: 0,
    trl: 6,
    baselineIdiotIndex: 12.0,
    baselineCapitalCost: 800,
    baselineFixedOm: 20,
    learningRate: 0.85,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Superconducting magnets for magnetic confinement. Major cost driver with significant learning potential.',
  },
  {
    account: '22.1.5',
    name: 'Structural Support',
    absoluteCapitalCost: 150,
    absoluteFixedOm: 3,
    variableOm: 0,
    trl: 7,
    baselineIdiotIndex: 2.5,
    baselineCapitalCost: 150,
    baselineFixedOm: 3,
    learningRate: 0.92,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Structural framework and support systems. Mature industrial technology.',
  },
  {
    account: '22.1.6',
    name: 'Vacuum Systems',
    absoluteCapitalCost: 100,
    absoluteFixedOm: 5,
    variableOm: 0,
    trl: 7,
    baselineIdiotIndex: 4.0,
    baselineCapitalCost: 100,
    baselineFixedOm: 5,
    learningRate: 0.88,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Vacuum vessel and pumping systems for plasma containment.',
  },
  {
    account: '22.1.7',
    name: 'Power Supplies',
    absoluteCapitalCost: 200,
    absoluteFixedOm: 8,
    variableOm: 0,
    trl: 7,
    baselineIdiotIndex: 3.5,
    baselineCapitalCost: 200,
    baselineFixedOm: 8,
    learningRate: 0.88,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Magnet power supplies, heating systems, and auxiliary power.',
  },
  {
    account: '22.1.8',
    name: 'Laser/Driver (ICF)',
    absoluteCapitalCost: 1200,
    absoluteFixedOm: 40,
    variableOm: 0,
    trl: 5,
    baselineIdiotIndex: 18.0,
    baselineCapitalCost: 1200,
    baselineFixedOm: 40,
    learningRate: 0.82,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'High-power laser or particle beam driver for inertial confinement. Very high learning potential.',
  },
  {
    account: '22.1.8b',
    name: 'Implosion Drivers (non-laser)',
    absoluteCapitalCost: 150,
    absoluteFixedOm: 4.5,
    variableOm: 0,
    trl: 5,
    baselineIdiotIndex: 10.0,
    baselineCapitalCost: 150,
    baselineFixedOm: 4.5,
    learningRate: 0.85,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Non-laser implosion drivers for inertial confinement (e.g., pulsed power, heavy ion beams).',
  },
  {
    account: '22.1.9',
    name: 'Direct Energy Conversion',
    absoluteCapitalCost: 300,
    absoluteFixedOm: 10,
    variableOm: 0,
    trl: 3,
    baselineIdiotIndex: 15.0,
    baselineCapitalCost: 300,
    baselineFixedOm: 10,
    learningRate: 0.78,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Direct conversion of charged particle energy to electricity. Required for aneutronic fuels.',
  },
  {
    account: '22.5',
    name: 'Tritium Handling',
    absoluteCapitalCost: 250,
    absoluteFixedOm: 15,
    variableOm: 0,
    trl: 5,
    baselineIdiotIndex: 10.0,
    baselineCapitalCost: 250,
    baselineFixedOm: 15,
    learningRate: 0.85,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Tritium breeding, extraction, storage, and injection systems. Required for D-T fuel.',
  },
  {
    account: '22.6',
    name: 'He3 Production',
    absoluteCapitalCost: 400,
    absoluteFixedOm: 20,
    variableOm: 0,
    trl: 4,
    baselineIdiotIndex: 12.0,
    baselineCapitalCost: 400,
    baselineFixedOm: 20,
    learningRate: 0.80,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Helium-3 production or supply infrastructure. Required for D-He3 fuel.',
  },
  {
    account: '23',
    name: 'Turbine Plant',
    absoluteCapitalCost: 400,
    absoluteFixedOm: 12,
    variableOm: 0.5,
    trl: 9,
    baselineIdiotIndex: 2.0,
    baselineCapitalCost: 400,
    baselineFixedOm: 12,
    learningRate: 0.96,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Steam turbine and generator for thermal-to-electric conversion. Mature technology.',
  },
  {
    account: '24-26',
    name: 'Balance of Plant',
    absoluteCapitalCost: 350,
    absoluteFixedOm: 10,
    variableOm: 0.3,
    trl: 9,
    baselineIdiotIndex: 1.5,
    baselineCapitalCost: 350,
    baselineFixedOm: 10,
    learningRate: 0.95,
    required: false,
    disabled: false,
    lockedCapex: false,
    lockedOm: false,
    description: 'Cooling systems, electrical systems, buildings, and site infrastructure.',
  },
];

const DEFAULT_FINANCIAL_PARAMS: FinancialParams = {
  wacc: 0.08,
  lifetime: 40,
  capacityFactor: 0.90,
  capacityMw: 1000,
  constructionTime: 5,
  unitsDeployed: 2,
};

interface FusionStore {
  // State
  targetLcoe: number;
  fuelType: FuelType;
  confinementType: ConfinementType;
  subsystems: Subsystem[];
  financialParams: FinancialParams;

  // Computed (cached)
  lcoeBreakdown: LCOEBreakdown;
  feasibility: FeasibilityResult;
  totalCapexAbs: number;
  totalCapexPerKw: number;
  isTargetAttainable: boolean;
  minimumAttainableLcoe: number;

  // Actions
  setTargetLcoe: (value: number) => void;
  setFuelType: (fuelType: FuelType) => void;
  setConfinementType: (confinementType: ConfinementType) => void;
  updateSubsystem: (account: string, updates: Partial<Subsystem>) => void;
  updateFinancialParams: (updates: Partial<FinancialParams>) => void;
  resetToDefaults: () => void;
  recalculate: () => void;
}

/**
 * Update subsystem disabled/required status based on multipliers
 */
function updateSubsystemStatus(
  subsystems: Subsystem[],
  fuelType: FuelType,
  confinementType: ConfinementType
): Subsystem[] {
  return subsystems.map(sub => {
    const multiplier = getEffectiveMultiplier(sub.account, confinementType, fuelType);
    return {
      ...sub,
      disabled: multiplier === 0,
      required: multiplier > 0 && multiplier !== 1, // Mark as "required" if it has a non-unity multiplier
    };
  });
}

export const useFusionStore = create<FusionStore>((set, get) => {
  // Initialize with D-T + Tokamak
  const initialSubsystems = updateSubsystemStatus(DEFAULT_SUBSYSTEMS, 'D-T', 'Tokamak');
  const initialBreakdown = calculateLCOE(initialSubsystems, DEFAULT_FINANCIAL_PARAMS, 'D-T', 'Tokamak');
  const initialFeasibility = getFeasibilityStatus(initialBreakdown.totalLcoe, 10);
  const initialCapexAbs = initialSubsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
  const initialCapexPerKw = initialSubsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, DEFAULT_FINANCIAL_PARAMS.capacityMw), 0);

  return {
    targetLcoe: 10,
    fuelType: 'D-T',
    confinementType: 'Tokamak',
    subsystems: initialSubsystems,
    financialParams: DEFAULT_FINANCIAL_PARAMS,
    lcoeBreakdown: initialBreakdown,
    feasibility: initialFeasibility,
    totalCapexAbs: initialCapexAbs,
    totalCapexPerKw: initialCapexPerKw,
    isTargetAttainable: initialBreakdown.totalLcoe <= 10 * 1.01,
    minimumAttainableLcoe: initialBreakdown.totalLcoe,

    setTargetLcoe: (value) => {
      set({ targetLcoe: value });
      get().recalculate();
    },

    setFuelType: (fuelType) => {
      const { confinementType } = get();
      const subsystems = updateSubsystemStatus(get().subsystems, fuelType, confinementType);
      set({ fuelType, subsystems });
      get().recalculate();
    },

    setConfinementType: (confinementType) => {
      const { fuelType } = get();
      const subsystems = updateSubsystemStatus(get().subsystems, fuelType, confinementType);
      set({ confinementType, subsystems });
      get().recalculate();
    },

    updateSubsystem: (account, updates) => {
      const subsystems = get().subsystems.map(sub =>
        sub.account === account ? { ...sub, ...updates } : sub
      );
      set({ subsystems });
      get().recalculate();
    },

    updateFinancialParams: (updates) => {
      const financialParams = { ...get().financialParams, ...updates };
      set({ financialParams });
      get().recalculate();
    },

    resetToDefaults: () => {
      const { fuelType, confinementType } = get();
      const subsystems = updateSubsystemStatus(DEFAULT_SUBSYSTEMS, fuelType, confinementType);
      set({
        subsystems,
        financialParams: DEFAULT_FINANCIAL_PARAMS,
      });
      get().recalculate();
    },

    recalculate: () => {
      const { subsystems, financialParams, fuelType, confinementType, targetLcoe } = get();
      const fuelInfo = FUEL_INFO[fuelType];
      const doublings = Math.log2(Math.max(1, financialParams.unitsDeployed));

      // Step 1: Calculate baseline LCOE (with multipliers but no learning)
      const activeSubsystems = subsystems.filter(s => !s.disabled);

      // Calculate baseline costs with multipliers
      const baselineCosts = activeSubsystems.map(sub => {
        const multiplier = getEffectiveMultiplier(sub.account, confinementType, fuelType);
        return {
          account: sub.account,
          baselineCapex: sub.baselineCapitalCost * multiplier,
          baselineOm: sub.baselineFixedOm * multiplier,
          idiotIndex: sub.baselineIdiotIndex,
          trl: sub.trl,
        };
      });

      const totalBaselineCapex = baselineCosts.reduce((sum, s) => sum + s.baselineCapex, 0);
      const totalBaselineOm = baselineCosts.reduce((sum, s) => sum + s.baselineOm, 0);
      const totalVariableOm = activeSubsystems.reduce((sum, s) => sum + s.variableOm, 0);

      // Calculate baseline LCOE
      const effectiveCF = financialParams.capacityFactor * fuelInfo.cfModifier;
      const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
      const energyPerKw = (effectiveCF * 8760) / 1000;

      const baselineCapexPerKw = (totalBaselineCapex * 1e6) / (financialParams.capacityMw * 1000) * fuelInfo.regulatoryModifier;
      const baselineOmPerKw = (totalBaselineOm * 1e6) / (financialParams.capacityMw * 1000);
      const baselineLcoe = (crf * baselineCapexPerKw + baselineOmPerKw) / energyPerKw + totalVariableOm;

      // Step 2: Calculate required cost reduction to hit target
      const reductionRatio = targetLcoe / baselineLcoe;

      // Step 3: Distribute reduction across subsystems weighted by idiot index
      const totalII = baselineCosts.reduce((sum, s) => sum + s.idiotIndex, 0);

      // Step 4: Compute learning rates and costs for each subsystem
      const subsystemsWithLR = subsystems.map(sub => {
        if (sub.disabled) {
          return {
            ...sub,
            learningRate: 1,
            absoluteCapitalCost: 0,
            absoluteFixedOm: 0,
            lrOutOfRange: false,
          };
        }

        const multiplier = getEffectiveMultiplier(sub.account, confinementType, fuelType);
        const effectiveBaselineCapex = sub.baselineCapitalCost * multiplier;
        const effectiveBaselineOm = sub.baselineFixedOm * multiplier;

        let requiredLR = 1.0;
        let targetCapex = effectiveBaselineCapex;
        let targetOm = effectiveBaselineOm;

        const plausibleRange = getPlausibleLRRange(sub.trl);

        let unclampedLR = 1.0;

        if (reductionRatio < 1 && doublings > 0 && totalII > 0) {
          // Weight reduction by idiot index - higher II gets more aggressive learning
          const iiWeight = sub.baselineIdiotIndex / totalII;
          const avgReduction = 1 - reductionRatio;

          // Subsystems with higher II get proportionally more reduction
          const weightedReduction = avgReduction * (iiWeight * activeSubsystems.length);
          const targetCostRatio = Math.max(0.01, 1 - weightedReduction);

          // Compute required learning rate: LR = costRatio^(1/doublings)
          unclampedLR = Math.pow(targetCostRatio, 1 / doublings);
          // Clamp to TRL minimum floor (can't be more aggressive than plausible)
          requiredLR = Math.max(plausibleRange.min, Math.min(1, unclampedLR));

          // Compute actual costs with this learning rate
          targetCapex = effectiveBaselineCapex * Math.pow(requiredLR, doublings);
          targetOm = effectiveBaselineOm * Math.pow(requiredLR, doublings);
        } else if (doublings <= 0) {
          // N=1: no learning possible, costs stay at baseline
          requiredLR = 1.0;
          targetCapex = effectiveBaselineCapex;
          targetOm = effectiveBaselineOm;
        }

        // Flag only if unclamped LR would be BELOW the floor (forced to clamp)
        const lrOutOfRange = unclampedLR < plausibleRange.min;

        return {
          ...sub,
          learningRate: requiredLR,
          absoluteCapitalCost: Math.round(targetCapex),
          absoluteFixedOm: Math.round(targetOm),
          lrOutOfRange,
        };
      });

      const lcoeBreakdown = calculateLCOE(subsystemsWithLR, financialParams, fuelType, confinementType);
      const feasibility = getFeasibilityStatus(lcoeBreakdown.totalLcoe, targetLcoe);
      const totalCapexAbs = subsystemsWithLR
        .filter(s => !s.disabled)
        .reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
      const totalCapexPerKw = subsystemsWithLR
        .filter(s => !s.disabled)
        .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0);

      // Calculate minimum achievable LCOE using most aggressive plausible LRs (TRL min)
      const minCostSubsystems = subsystems.map(sub => {
        if (sub.disabled) {
          return { ...sub, absoluteCapitalCost: 0, absoluteFixedOm: 0 };
        }
        const multiplier = getEffectiveMultiplier(sub.account, confinementType, fuelType);
        const effectiveBaselineCapex = sub.baselineCapitalCost * multiplier;
        const effectiveBaselineOm = sub.baselineFixedOm * multiplier;

        // Use most aggressive plausible LR (TRL min)
        const plausibleRange = getPlausibleLRRange(sub.trl);
        const mostAggressiveLR = plausibleRange.min;

        // Apply learning curve with most aggressive LR
        const minCapex = doublings > 0
          ? effectiveBaselineCapex * Math.pow(mostAggressiveLR, doublings)
          : effectiveBaselineCapex;
        const minOm = doublings > 0
          ? effectiveBaselineOm * Math.pow(mostAggressiveLR, doublings)
          : effectiveBaselineOm;

        return { ...sub, absoluteCapitalCost: Math.round(minCapex), absoluteFixedOm: Math.round(minOm) };
      });

      const minLcoeBreakdown = calculateLCOE(minCostSubsystems, financialParams, fuelType, confinementType);
      const minimumAttainableLcoe = minLcoeBreakdown.totalLcoe;

      // Check if any subsystem has an out-of-range learning rate
      const hasAnyOutOfRangeLR = subsystemsWithLR.some(s => !s.disabled && s.lrOutOfRange);

      // Target is attainable if it's >= minimum achievable AND no subsystem has unrealistic LR
      const isTargetAttainable = targetLcoe >= minimumAttainableLcoe * 0.99 && !hasAnyOutOfRangeLR;

      set({ subsystems: subsystemsWithLR, lcoeBreakdown, feasibility, totalCapexAbs, totalCapexPerKw, isTargetAttainable, minimumAttainableLcoe });
    },
  };
});
