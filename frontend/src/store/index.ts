import { create } from 'zustand';
import {
  Subsystem,
  FinancialParams,
  FuelType,
  ConfinementType,
  LCOEBreakdown,
  FeasibilityResult,
  FUEL_CONSTRAINTS,
  CONFINEMENT_CONSTRAINTS,
  calculateLCOE,
  getFeasibilityStatus,
  capitalCostPerKw,
  solveAndApplyTarget,
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
    description: 'High-power laser or particle beam driver for inertial confinement. Very high learning potential.',
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
    description: 'Cooling systems, electrical systems, buildings, and site infrastructure.',
  },
];

const DEFAULT_FINANCIAL_PARAMS: FinancialParams = {
  wacc: 0.08,
  lifetime: 40,
  capacityFactor: 0.90,
  capacityMw: 1000,
  constructionTime: 5,
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

  // Solve result message
  solveMessage: string | null;

  // Actions
  setTargetLcoe: (value: number) => void;
  setFuelType: (fuelType: FuelType) => void;
  setConfinementType: (confinementType: ConfinementType) => void;
  updateSubsystem: (account: string, updates: Partial<Subsystem>) => void;
  updateFinancialParams: (updates: Partial<FinancialParams>) => void;
  resetToDefaults: () => void;
  recalculate: () => void;
  applyTargetLcoe: () => { success: boolean; message: string };
  clearSolveMessage: () => void;
}

function applyConstraints(
  subsystems: Subsystem[],
  fuelType: FuelType,
  confinementType: ConfinementType
): Subsystem[] {
  const fuelConstraints = FUEL_CONSTRAINTS[fuelType];
  const confinementConstraints = CONFINEMENT_CONSTRAINTS[confinementType];

  const required = new Set([
    ...fuelConstraints.requiredSubsystems,
    ...confinementConstraints.requiredSubsystems,
  ]);
  const disabled = new Set([
    ...fuelConstraints.disabledSubsystems,
    ...confinementConstraints.disabledSubsystems,
  ]);

  return subsystems.map(sub => ({
    ...sub,
    required: required.has(sub.account),
    disabled: disabled.has(sub.account),
  }));
}

export const useFusionStore = create<FusionStore>((set, get) => {
  // Initialize with D-T + MCF constraints applied
  const initialSubsystems = applyConstraints(DEFAULT_SUBSYSTEMS, 'D-T', 'MCF');
  const initialBreakdown = calculateLCOE(initialSubsystems, DEFAULT_FINANCIAL_PARAMS, 'D-T', 'MCF');
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
    confinementType: 'MCF',
    subsystems: initialSubsystems,
    financialParams: DEFAULT_FINANCIAL_PARAMS,
    lcoeBreakdown: initialBreakdown,
    feasibility: initialFeasibility,
    totalCapexAbs: initialCapexAbs,
    totalCapexPerKw: initialCapexPerKw,
    solveMessage: null,

    setTargetLcoe: (value) => {
      set({ targetLcoe: value, solveMessage: null });
      get().recalculate();
    },

    setFuelType: (fuelType) => {
      const { confinementType } = get();
      const subsystems = applyConstraints(get().subsystems, fuelType, confinementType);
      set({ fuelType, subsystems });
      get().recalculate();
    },

    setConfinementType: (confinementType) => {
      const { fuelType } = get();
      const subsystems = applyConstraints(get().subsystems, fuelType, confinementType);
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
      const subsystems = applyConstraints(DEFAULT_SUBSYSTEMS, fuelType, confinementType);
      set({
        subsystems,
        financialParams: DEFAULT_FINANCIAL_PARAMS,
      });
      get().recalculate();
    },

    recalculate: () => {
      const { subsystems, financialParams, fuelType, confinementType, targetLcoe } = get();
      const lcoeBreakdown = calculateLCOE(subsystems, financialParams, fuelType, confinementType);
      const feasibility = getFeasibilityStatus(lcoeBreakdown.totalLcoe, targetLcoe);
      const totalCapexAbs = subsystems
        .filter(s => !s.disabled)
        .reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
      const totalCapexPerKw = subsystems
        .filter(s => !s.disabled)
        .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0);
      set({ lcoeBreakdown, feasibility, totalCapexAbs, totalCapexPerKw });
    },

    applyTargetLcoe: () => {
      const { targetLcoe, subsystems, financialParams, fuelType } = get();
      const result = solveAndApplyTarget(targetLcoe, subsystems, financialParams, fuelType);

      if (result.success) {
        set({ subsystems: result.subsystems, solveMessage: result.message });
        get().recalculate();
      } else {
        set({ solveMessage: result.message });
      }

      return { success: result.success, message: result.message };
    },

    clearSolveMessage: () => {
      set({ solveMessage: null });
    },
  };
});
