/**
 * Client-side LCOE calculations for instant responsiveness.
 * These mirror the backend calculations for real-time slider updates.
 */

export interface Subsystem {
  account: string;
  name: string;
  // Baseline costs (first unit / FOAK)
  baselineCapitalCost: number;  // $M - First unit capital cost (user-adjustable)
  baselineFixedOm: number;      // $M/yr - First unit O&M (user-adjustable)
  baselineIdiotIndex: number;   // Original idiot index at baseline cost
  // Computed costs after learning (Nth unit / NOAK)
  absoluteCapitalCost: number;  // $M - Computed from baseline × LR^(log2(N))
  absoluteFixedOm: number;      // $M/yr - Computed from baseline × LR^(log2(N))
  variableOm: number;           // $/MWh - Not affected by learning
  // Learning parameters
  learningRate: number;         // Learning curve rate (e.g., 0.85 = 15% cost reduction per doubling)
  trl: number;                  // Technology Readiness Level (affects plausible LR range)
  // State flags
  required: boolean;
  disabled: boolean;
  lockedCapex: boolean;         // If true, solver won't modify learning rate
  lockedOm: boolean;            // If true, solver won't modify O&M learning
  description?: string;
  // Validation
  lrOutOfRange?: boolean;       // True if learning rate is below TRL-based minimum
}

/**
 * Calculate O&M as percentage of capital cost
 */
export function omPercentOfCapital(subsystem: Subsystem): number {
  if (subsystem.absoluteCapitalCost <= 0) return 0;
  return (subsystem.absoluteFixedOm / subsystem.absoluteCapitalCost) * 100;
}

/**
 * Calculate current idiot index based on cost reduction from baseline
 * As costs decrease, idiot index decreases (learning has been captured)
 */
export function calculateIdiotIndex(subsystem: Subsystem): number {
  if (subsystem.baselineCapitalCost <= 0) return subsystem.baselineIdiotIndex;
  const ratio = subsystem.absoluteCapitalCost / subsystem.baselineCapitalCost;
  // Idiot index decreases as cost decreases, but floor at 1.0
  return Math.max(1.0, subsystem.baselineIdiotIndex * ratio);
}

/**
 * Learning curve calculation: How many production doublings are needed to achieve a cost reduction?
 *
 * Wright's Law: C_n = C_1 * n^b where b = ln(learning_rate) / ln(2)
 * For a learning rate of 85%, each doubling of cumulative production reduces cost by 15%
 *
 * Given current cost ratio r = currentCost / baselineCost:
 * Number of doublings d = ln(r) / ln(learningRate)
 * Number of units n = 2^d (assuming starting from 1 unit at baseline)
 */
export interface LearningCurveResult {
  doublings: number;        // Number of production doublings needed
  unitsNeeded: number;      // Approximate units to produce (2^doublings)
  costReductionPct: number; // Percentage cost reduction from baseline
  isReduction: boolean;     // Whether this represents a cost reduction (vs increase)
}

export function calculateLearningCurveProgress(subsystem: Subsystem): LearningCurveResult {
  const ratio = subsystem.absoluteCapitalCost / subsystem.baselineCapitalCost;
  const costReductionPct = (1 - ratio) * 100;
  const isReduction = ratio < 1;

  // If no reduction or at baseline, no doublings needed
  if (ratio >= 1) {
    return {
      doublings: 0,
      unitsNeeded: 1,
      costReductionPct: Math.max(0, costReductionPct),
      isReduction: false,
    };
  }

  // Calculate doublings needed using learning curve formula
  // r = learningRate^d, so d = ln(r) / ln(learningRate)
  const learningRate = subsystem.learningRate;

  // Protect against invalid learning rates
  if (learningRate <= 0 || learningRate >= 1) {
    return {
      doublings: 0,
      unitsNeeded: 1,
      costReductionPct,
      isReduction,
    };
  }

  const doublings = Math.log(ratio) / Math.log(learningRate);
  const unitsNeeded = Math.pow(2, doublings);

  return {
    doublings: Math.max(0, doublings),
    unitsNeeded: Math.max(1, Math.round(unitsNeeded)),
    costReductionPct,
    isReduction,
  };
}

/**
 * Get learning rate description based on TRL and technology type
 */
export function getLearningRateDescription(learningRate: number): string {
  if (learningRate >= 0.95) return 'Very slow (commodity)';
  if (learningRate >= 0.90) return 'Slow (mature)';
  if (learningRate >= 0.85) return 'Moderate (industrial)';
  if (learningRate >= 0.80) return 'Fast (complex systems)';
  return 'Very fast (high-tech)';
}

/**
 * TRL to plausible learning rate range mapping
 * Based on historical data for technologies at different maturity levels
 */
export function getPlausibleLRRange(trl: number): { min: number; max: number } {
  if (trl <= 4) {
    // TRL 3-4: Very fast learning (high-tech, early development)
    return { min: 0.78, max: 0.80 };
  } else if (trl <= 6) {
    // TRL 5-6: Moderate learning (industrial scale-up)
    return { min: 0.83, max: 0.87 };
  } else if (trl <= 8) {
    // TRL 7-8: Slow learning (mature technology)
    return { min: 0.88, max: 0.92 };
  } else {
    // TRL 9: Very slow learning (commodity)
    return { min: 0.95, max: 0.96 };
  }
}

/**
 * Get learning rate slider bounds based on TRL and Idiot Index
 * Lower TRL and higher II allow for more aggressive (lower) learning rates
 *
 * @param trl Technology Readiness Level (1-9)
 * @param idiotIndex Ratio of cost to raw materials (higher = more learning potential)
 * @returns Slider bounds { min, max, default }
 */
export function getLearningRateBounds(trl: number, idiotIndex: number): { min: number; max: number; default: number } {
  // Base range from TRL
  const trlRange = getPlausibleLRRange(trl);

  // Idiot Index adjustment: higher II allows more aggressive learning
  // II > 10: can go 5% lower than TRL minimum
  // II > 5: can go 2% lower
  // II <= 2: constrained to TRL range
  let minAdjustment = 0;
  if (idiotIndex > 10) {
    minAdjustment = 0.05;
  } else if (idiotIndex > 5) {
    minAdjustment = 0.02;
  }

  // Slider bounds: allow some flexibility around the plausible range
  const min = Math.max(0.70, trlRange.min - minAdjustment - 0.05); // Allow going a bit below plausible
  const max = 0.98; // Cap at 98% (some learning always possible)
  const defaultLR = (trlRange.min + trlRange.max) / 2; // Default to middle of plausible range

  return { min, max, default: defaultLR };
}

/**
 * Compute the learned cost after N units deployed using Wright's Law
 *
 * Wright's Law: C_n = C_1 × n^b where b = ln(LR) / ln(2)
 * This simplifies to: C_n = C_1 × LR^(log2(n))
 *
 * @param baselineCost Cost of the first unit
 * @param learningRate Learning rate (e.g., 0.85 = 15% cost reduction per doubling)
 * @param unitsDeployed Number of cumulative units deployed
 * @returns Cost at the Nth unit
 */
export function computeLearnedCost(baselineCost: number, learningRate: number, unitsDeployed: number): number {
  if (unitsDeployed <= 1) {
    return baselineCost; // First unit is at baseline cost
  }
  if (learningRate >= 1) {
    return baselineCost; // No learning
  }
  if (learningRate <= 0) {
    return 0; // Invalid, but handle gracefully
  }

  const doublings = Math.log2(unitsDeployed);
  const learnedCost = baselineCost * Math.pow(learningRate, doublings);

  return Math.max(0, learnedCost);
}

/**
 * Inverse Wright's Law: Compute required learning rate from cost ratio and units deployed
 *
 * Given: costRatio = currentCost / baselineCost
 *        doublings = log2(N)
 *
 * Required LR = costRatio^(1/doublings)
 *
 * @param costRatio - Ratio of current cost to baseline cost (0 < ratio <= 1 for reduction)
 * @param unitsDeployed - Number of units deployed (N)
 * @returns Learning rate clamped to [0.50, 0.99]
 */
export function computeRequiredLearningRate(costRatio: number, unitsDeployed: number): number {
  // Edge cases
  if (unitsDeployed <= 1) {
    // With 1 or fewer units, no learning is possible - return 1.0 (no reduction per doubling)
    return 1.0;
  }
  if (costRatio >= 1) {
    // No cost reduction needed
    return 1.0;
  }
  if (costRatio <= 0) {
    // Invalid ratio
    return 0.50;
  }

  const doublings = Math.log2(unitsDeployed);
  if (doublings <= 0) {
    return 1.0;
  }

  // LR = costRatio^(1/doublings)
  const requiredLR = Math.pow(costRatio, 1 / doublings);

  // Clamp to reasonable range [0.50, 0.99]
  return Math.max(0.50, Math.min(0.99, requiredLR));
}

/**
 * Check if a computed learning rate is plausible for the given TRL
 * Applies 5% tolerance to the base range minimum
 * Only flags as out of range when LR is LESS than minimum (too aggressive)
 *
 * @param computedLR - The computed learning rate
 * @param trl - Technology Readiness Level (1-9)
 * @returns Object with inRange boolean and the applicable range
 */
export function isLearningRatePlausible(
  computedLR: number,
  trl: number
): { inRange: boolean; range: { min: number; max: number }; toleranceRange: { min: number; max: number } } {
  const baseRange = getPlausibleLRRange(trl);

  // Apply 5% tolerance (5 percentage points) to minimum only
  const toleranceRange = {
    min: Math.max(0.50, baseRange.min - 0.05),
    max: 1.00, // No upper limit - higher LR (slower learning) is always plausible
  };

  // Only flag as out of range when LR is too low (too aggressive learning)
  const inRange = computedLR >= toleranceRange.min;

  return { inRange, range: baseRange, toleranceRange };
}

export interface FinancialParams {
  wacc: number;
  lifetime: number;
  capacityFactor: number;
  capacityMw: number;
  constructionTime: number;
  unitsDeployed: number;  // Global N for fleet deployment
}

export type FuelType = 'D-T' | 'D-He3' | 'p-B11';
export type ConfinementType = 'Tokamak' | 'Spherical Tokamak' | 'Stellarator' | 'Z-Pinch' | 'Magnetized Target' | 'Inertial';

// Confinement multipliers per account
// "-" in the original table means no confinement multiplier applies (use 1.0, fuel multiplier only)
export const CONFINEMENT_MULTIPLIERS: Record<ConfinementType, Record<string, number>> = {
  'Tokamak': {
    '22.1.1': 1, '22.1.2': 1, '22.1.3': 1, '22.1.5': 1, '22.1.6': 1, '22.1.7': 1,
    '22.1.8': 0, '22.1.8b': 0, '23': 1, '24-26': 1, '22.5': 1,
  },
  'Spherical Tokamak': {
    '22.1.1': 0.7, '22.1.2': 0.7, '22.1.3': 1.3, '22.1.5': 0.8, '22.1.6': 0.8, '22.1.7': 1.8,
    '22.1.8': 0, '22.1.8b': 0, '23': 1.2, '24-26': 0.9, '22.5': 0.9,
  },
  'Stellarator': {
    '22.1.1': 1.1, '22.1.2': 1.1, '22.1.3': 2.5, '22.1.5': 1.5, '22.1.6': 1.4, '22.1.7': 0.8,
    '22.1.8': 0, '22.1.8b': 0, '23': 1, '24-26': 1.1, '22.5': 1,
  },
  'Z-Pinch': {
    '22.1.1': 0.8, '22.1.2': 0.8, '22.1.3': 0.1, '22.1.5': 0.5, '22.1.6': 0.6, '22.1.7': 2,
    '22.1.8': 0, '22.1.8b': 0, '23': 1.5, '24-26': 0.7, '22.5': 1,
  },
  'Magnetized Target': {
    '22.1.1': 0.8, '22.1.2': 0.8, '22.1.3': 0.05, '22.1.5': 0.4, '22.1.6': 0.5, '22.1.7': 1.2,
    '22.1.8': 0, '22.1.8b': 1, '23': 1.4, '24-26': 0.6, '22.5': 1,
  },
  'Inertial': {
    '22.1.1': 0.8, '22.1.2': 0.8, '22.1.3': 0, '22.1.5': 0.5, '22.1.6': 0.7, '22.1.7': 1.5,
    '22.1.8': 1, '22.1.8b': 0, '23': 1.4, '24-26': 0.7, '22.5': 1,
  },
};

// Fuel multipliers per account
// 0 means the account is not used for that fuel type
export const FUEL_MULTIPLIERS: Record<FuelType, Record<string, number>> = {
  'D-T': {
    '22.1.1': 1, '22.1.2': 1, '22.1.3': 1, '22.1.5': 1, '22.1.6': 1, '22.1.7': 1,
    '22.1.8': 1, '22.1.8b': 1, '23': 1, '24-26': 1, '22.5': 1, '22.1.9': 0, '22.6': 0,
  },
  'D-He3': {
    '22.1.1': 0.3, '22.1.2': 0.3, '22.1.3': 1.8, '22.1.5': 0.8, '22.1.6': 1.2, '22.1.7': 1.5,
    '22.1.8': 1, '22.1.8b': 1, '23': 0, '24-26': 0.8, '22.5': 0.2, '22.1.9': 1, '22.6': 1,
  },
  'p-B11': {
    '22.1.1': 0.1, '22.1.2': 0.1, '22.1.3': 2, '22.1.5': 0.7, '22.1.6': 1.3, '22.1.7': 1.8,
    '22.1.8': 1, '22.1.8b': 1, '23': 0, '24-26': 0.7, '22.5': 0.1, '22.1.9': 0.85, '22.6': 0,
  },
};

// Fuel descriptions and modifiers (CF and regulatory)
export const FUEL_INFO: Record<FuelType, { cfModifier: number; regulatoryModifier: number; description: string }> = {
  'D-T': {
    cfModifier: 0.95,
    regulatoryModifier: 1.20,
    description: 'D-T fusion requires tritium breeding. High neutron flux causes material damage (-5% CF) and requires additional regulatory compliance (+20% costs).',
  },
  'D-He3': {
    cfModifier: 0.98,
    regulatoryModifier: 1.10,
    description: 'D-He3 fusion produces fewer neutrons, reducing material damage and regulatory burden. Enables direct energy conversion.',
  },
  'p-B11': {
    cfModifier: 1.0,
    regulatoryModifier: 1.0,
    description: 'p-B11 is aneutronic, enabling direct energy conversion. Minimal regulatory burden, but requires much higher plasma temperatures.',
  },
};

// Confinement descriptions
export const CONFINEMENT_INFO: Record<ConfinementType, { description: string }> = {
  'Tokamak': {
    description: 'Conventional tokamak with superconducting magnets. Baseline reference design.',
  },
  'Spherical Tokamak': {
    description: 'Compact tokamak with low aspect ratio. Reduced shielding but higher recirculating power.',
  },
  'Stellarator': {
    description: 'Steady-state operation with complex 3D magnets. No plasma current drive needed.',
  },
  'Z-Pinch': {
    description: 'Pulsed linear device using plasma self-field. Minimal external magnets.',
  },
  'Magnetized Target': {
    description: 'Magneto-inertial fusion. Combines magnetic and inertial approaches to plasma compression.',
  },
  'Inertial': {
    description: 'Laser-driven inertial confinement. Pulsed operation with target injection.',
  },
};

/**
 * Get the effective multiplier for a subsystem based on confinement and fuel type
 */
export function getEffectiveMultiplier(
  account: string,
  confinementType: ConfinementType,
  fuelType: FuelType
): number {
  const confinementMult = CONFINEMENT_MULTIPLIERS[confinementType]?.[account];
  const fuelMult = FUEL_MULTIPLIERS[fuelType]?.[account];

  // If either multiplier is undefined, the account doesn't vary by that dimension
  // If either is 0, the account is disabled for that configuration
  const confMult = confinementMult !== undefined ? confinementMult : 1;
  const fMult = fuelMult !== undefined ? fuelMult : 1;

  return confMult * fMult;
}

/**
 * Calculate capital cost per kW from absolute cost
 */
export function capitalCostPerKw(absoluteCostM: number, capacityMw: number): number {
  if (capacityMw <= 0) return 0;
  return (absoluteCostM * 1e6) / (capacityMw * 1000);
}

/**
 * Calculate fixed O&M per kW-yr from absolute cost
 */
export function fixedOmPerKw(absoluteCostM: number, capacityMw: number): number {
  if (capacityMw <= 0) return 0;
  return (absoluteCostM * 1e6) / (capacityMw * 1000);
}

/**
 * Calculate Capital Recovery Factor
 */
export function calculateCRF(wacc: number, lifetime: number): number {
  if (wacc <= 0) return 1 / lifetime;
  const numerator = wacc * Math.pow(1 + wacc, lifetime);
  const denominator = Math.pow(1 + wacc, lifetime) - 1;
  return numerator / denominator;
}

export interface LCOEBreakdown {
  capitalContribution: number;
  fixedOmContribution: number;
  variableOmContribution: number;
  fuelContribution: number;
  totalLcoe: number;
  subsystemCapital: Record<string, number>;
  subsystemOm: Record<string, number>;
}

/**
 * Calculate LCOE from subsystems and financial parameters
 * Applies confinement and fuel multipliers to baseline costs
 */
export function calculateLCOE(
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType,
  confinementType: ConfinementType
): LCOEBreakdown {
  const fuelInfo = FUEL_INFO[fuelType];
  const effectiveCF = financialParams.capacityFactor * fuelInfo.cfModifier;
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
  const hoursPerYear = 8760;
  const energyPerKw = (effectiveCF * hoursPerYear) / 1000; // MWh per kW per year

  let totalCapex = 0;
  let totalFixedOm = 0;
  let totalVariableOm = 0;
  const subsystemCapital: Record<string, number> = {};
  const subsystemOm: Record<string, number> = {};

  for (const sub of subsystems) {
    // Get effective multiplier for this subsystem
    const multiplier = getEffectiveMultiplier(sub.account, confinementType, fuelType);

    // Skip if multiplier is 0 (subsystem not used for this configuration)
    if (multiplier === 0) continue;

    // Apply multiplier to baseline costs, then use user-adjusted ratio
    // effectiveCost = baselineCost * multiplier * (currentCost / baselineCost)
    //               = currentCost * multiplier
    const effectiveCapitalCost = sub.absoluteCapitalCost * multiplier;
    const effectiveFixedOm = sub.absoluteFixedOm * multiplier;

    // Convert absolute costs to $/kW
    const capPerKw = capitalCostPerKw(effectiveCapitalCost, financialParams.capacityMw);
    const omPerKw = fixedOmPerKw(effectiveFixedOm, financialParams.capacityMw);

    totalCapex += capPerKw;
    totalFixedOm += omPerKw;
    totalVariableOm += sub.variableOm * multiplier;

    // Apply regulatory modifier to per-subsystem capital contribution so they sum correctly
    const subCapitalContrib = (crf * capPerKw * fuelInfo.regulatoryModifier) / energyPerKw;
    const subOmContrib = omPerKw / energyPerKw + sub.variableOm * multiplier;

    subsystemCapital[sub.account] = Math.round(subCapitalContrib * 100) / 100;
    subsystemOm[sub.account] = Math.round(subOmContrib * 100) / 100;
  }

  // Apply regulatory modifier to total
  totalCapex *= fuelInfo.regulatoryModifier;

  const capitalContribution = (crf * totalCapex) / energyPerKw;
  const fixedOmContribution = totalFixedOm / energyPerKw;
  const variableOmContribution = totalVariableOm;
  const fuelContribution = 0;

  const totalLcoe = capitalContribution + fixedOmContribution + variableOmContribution + fuelContribution;

  // Verification: sum of per-subsystem values should match totals
  const sumSubsystemCapital = Object.values(subsystemCapital).reduce((a, b) => a + b, 0);
  const sumSubsystemOm = Object.values(subsystemOm).reduce((a, b) => a + b, 0);
  const sumTotal = sumSubsystemCapital + sumSubsystemOm;

  // Only log if there's a significant mismatch (debugging aid)
  if (Math.abs(sumTotal - totalLcoe) > 0.5) {
    console.error('LCOE MISMATCH:', { sumTotal: sumTotal.toFixed(2), totalLcoe: totalLcoe.toFixed(2), diff: (sumTotal - totalLcoe).toFixed(2) });
  }

  return {
    capitalContribution: Math.round(capitalContribution * 100) / 100,
    fixedOmContribution: Math.round(fixedOmContribution * 100) / 100,
    variableOmContribution: Math.round(variableOmContribution * 100) / 100,
    fuelContribution: Math.round(fuelContribution * 100) / 100,
    totalLcoe: Math.round(totalLcoe * 100) / 100,
    subsystemCapital,
    subsystemOm,
  };
}

export type FeasibilityStatus = 'green' | 'yellow' | 'red';

export interface FeasibilityResult {
  status: FeasibilityStatus;
  message: string;
  ratio: number;
}

/**
 * Get feasibility status based on calculated vs target LCOE
 */
export function getFeasibilityStatus(calculatedLcoe: number, targetLcoe: number): FeasibilityResult {
  const ratio = targetLcoe > 0 ? calculatedLcoe / targetLcoe : Infinity;

  if (ratio <= 1.0) {
    return {
      status: 'green',
      message: `Target achieved! $${calculatedLcoe.toFixed(2)}/MWh <= $${targetLcoe.toFixed(2)}/MWh`,
      ratio,
    };
  } else if (ratio <= 1.5) {
    const gap = calculatedLcoe - targetLcoe;
    return {
      status: 'yellow',
      message: `Close to target. $${gap.toFixed(2)}/MWh gap (${((ratio - 1) * 100).toFixed(0)}% over)`,
      ratio,
    };
  } else {
    const gap = calculatedLcoe - targetLcoe;
    return {
      status: 'red',
      message: `Significant gap. $${gap.toFixed(2)}/MWh above target (${((ratio - 1) * 100).toFixed(0)}% over)`,
      ratio,
    };
  }
}

/**
 * Solve for maximum allowable CapEx to hit target LCOE
 */
export function solveForCapex(
  targetLcoe: number,
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType
): { value: number; feasible: boolean; explanation: string; perKw: number } {
  const fuelInfo = FUEL_INFO[fuelType];
  const effectiveCF = financialParams.capacityFactor * fuelInfo.cfModifier;
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
  const energyPerKw = (effectiveCF * 8760) / 1000;

  const totalFixedOm = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0);
  const totalVariableOm = subsystems.filter(s => !s.disabled).reduce((sum, s) => sum + s.variableOm, 0);
  const currentCapexAbs = subsystems.filter(s => !s.disabled).reduce((sum, s) => sum + s.absoluteCapitalCost, 0);

  const maxCapexWithReg = ((targetLcoe - totalVariableOm) * energyPerKw - totalFixedOm) / crf;
  const maxCapexPerKw = maxCapexWithReg / fuelInfo.regulatoryModifier;
  const maxCapexAbs = maxCapexPerKw * financialParams.capacityMw * 1000 / 1e6;

  const feasible = maxCapexAbs > 0 && maxCapexAbs >= currentCapexAbs * 0.3;

  let explanation: string;
  if (maxCapexAbs <= 0) {
    explanation = `Impossible: O&M alone exceeds target LCOE of $${targetLcoe}/MWh`;
  } else if (maxCapexPerKw < 500) {
    explanation = `To hit $${targetLcoe}/MWh, total CapEx must be <= $${Math.round(maxCapexAbs)}M ($${Math.round(maxCapexPerKw)}/kW) - very aggressive`;
  } else {
    explanation = `To hit $${targetLcoe}/MWh, total CapEx must be <= $${Math.round(maxCapexAbs)}M ($${Math.round(maxCapexPerKw)}/kW)`;
  }

  return { value: Math.round(maxCapexAbs), feasible, explanation, perKw: Math.round(maxCapexPerKw) };
}

/**
 * Solve for required capacity factor to hit target LCOE
 */
export function solveForCapacityFactor(
  targetLcoe: number,
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType
): { value: number; feasible: boolean; explanation: string } {
  const fuelInfo = FUEL_INFO[fuelType];
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);

  const totalCapex = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0)
    * fuelInfo.regulatoryModifier;
  const totalFixedOm = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0);
  const totalVariableOm = subsystems.filter(s => !s.disabled).reduce((sum, s) => sum + s.variableOm, 0);

  const denominator = (targetLcoe - totalVariableOm) * 8760 / 1000;
  if (denominator <= 0) {
    return {
      value: Infinity,
      feasible: false,
      explanation: `Impossible: Variable O&M ($${totalVariableOm}/MWh) exceeds target LCOE`,
    };
  }

  const requiredCfBase = (crf * totalCapex + totalFixedOm) / denominator;
  const requiredCf = requiredCfBase / fuelInfo.cfModifier;

  const feasible = requiredCf >= 0.5 && requiredCf <= 0.98;

  let explanation: string;
  if (requiredCf > 1.0) {
    explanation = `Need ${(requiredCf * 100).toFixed(0)}% CF (impossible - max is 100%)`;
  } else if (requiredCf > 0.95) {
    explanation = `Need ${(requiredCf * 100).toFixed(1)}% CF (very aggressive - best plants achieve ~95%)`;
  } else if (requiredCf < 0.5) {
    explanation = `Need only ${(requiredCf * 100).toFixed(0)}% CF (easily achievable)`;
  } else {
    explanation = `Need ${(requiredCf * 100).toFixed(1)}% CF to hit $${targetLcoe}/MWh`;
  }

  return { value: Math.round(requiredCf * 1000) / 1000, feasible, explanation };
}

/**
 * Solve for required WACC to hit target LCOE (bisection)
 */
export function solveForWacc(
  targetLcoe: number,
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType
): { value: number; feasible: boolean; explanation: string } {
  const fuelInfo = FUEL_INFO[fuelType];
  const effectiveCF = financialParams.capacityFactor * fuelInfo.cfModifier;
  const energyPerKw = (effectiveCF * 8760) / 1000;

  const totalCapex = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0)
    * fuelInfo.regulatoryModifier;
  const totalFixedOm = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0);
  const totalVariableOm = subsystems.filter(s => !s.disabled).reduce((sum, s) => sum + s.variableOm, 0);

  const lcoeAtWacc = (wacc: number): number => {
    const crf = calculateCRF(wacc, financialParams.lifetime);
    return (crf * totalCapex + totalFixedOm) / energyPerKw + totalVariableOm;
  };

  const lcoeAt1pct = lcoeAtWacc(0.01);
  const lcoeAt25pct = lcoeAtWacc(0.25);

  if (lcoeAt1pct > targetLcoe) {
    return {
      value: 0,
      feasible: false,
      explanation: `Even at 1% WACC, LCOE is $${lcoeAt1pct.toFixed(1)}/MWh (above $${targetLcoe}/MWh target)`,
    };
  }

  if (lcoeAt25pct < targetLcoe) {
    return {
      value: 0.25,
      feasible: true,
      explanation: 'Target achievable even at 25% WACC',
    };
  }

  // Bisection
  let low = 0.01;
  let high = 0.25;
  let mid = 0.13;

  for (let i = 0; i < 50; i++) {
    mid = (low + high) / 2;
    const lcoeMid = lcoeAtWacc(mid);
    if (Math.abs(lcoeMid - targetLcoe) < 0.01) break;
    if (lcoeMid > targetLcoe) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const requiredWacc = mid;
  const feasible = requiredWacc >= 0.03;

  let explanation: string;
  if (requiredWacc < 0.03) {
    explanation = `Need ${(requiredWacc * 100).toFixed(1)}% WACC (below typical project finance rates)`;
  } else if (requiredWacc < 0.06) {
    explanation = `Need ${(requiredWacc * 100).toFixed(1)}% WACC (requires favorable financing)`;
  } else {
    explanation = `Need ${(requiredWacc * 100).toFixed(1)}% WACC to hit $${targetLcoe}/MWh`;
  }

  return { value: Math.round(requiredWacc * 1000) / 1000, feasible, explanation };
}

/**
 * Get learning potential description from idiot index
 */
export function getLearningPotential(idiotIndex: number): string {
  if (idiotIndex <= 2) return 'Limited (commodity)';
  if (idiotIndex <= 5) return 'Some (mature industrial)';
  if (idiotIndex <= 10) return 'Significant (complex systems)';
  return 'Massive (high-tech)';
}

/**
 * Solve for target LCOE by adjusting learning rates.
 * In the forward model, costs are computed from: baseline × LR^(log2(N))
 * To reduce costs, we decrease LR (more aggressive learning).
 * Prioritizes subsystems with highest idiot index (most learning potential).
 * Respects locked subsystems - won't modify their learning rates.
 * Returns updated subsystems with new learning rates.
 */
export function solveAndApplyTarget(
  targetLcoe: number,
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType
): { subsystems: Subsystem[]; success: boolean; message: string; implausibleLRCount: number } {
  const fuelInfo = FUEL_INFO[fuelType];
  const effectiveCF = financialParams.capacityFactor * fuelInfo.cfModifier;
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
  const energyPerKw = (effectiveCF * 8760) / 1000;
  const doublings = Math.log2(Math.max(1, financialParams.unitsDeployed));

  // Get active subsystems
  const activeSubsystems = subsystems.filter(s => !s.disabled);

  // Calculate current costs (using current learning rates)
  const currentCapexPerKw = activeSubsystems.reduce(
    (sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0
  ) * fuelInfo.regulatoryModifier;
  const currentOmPerKw = activeSubsystems.reduce(
    (sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0
  );
  const totalVariableOm = activeSubsystems.reduce((sum, s) => sum + s.variableOm, 0);

  // Current LCOE
  const currentLcoe = (crf * currentCapexPerKw + currentOmPerKw) / energyPerKw + totalVariableOm;

  if (currentLcoe <= targetLcoe) {
    // Already at target
    const implausibleCount = subsystems.filter(s => !s.disabled && s.lrOutOfRange).length;
    return {
      subsystems: subsystems.map(s => ({ ...s })), // Create new references
      success: true,
      message: `Already at or below target! Current LCOE $${currentLcoe.toFixed(2)}/MWh <= target $${targetLcoe}/MWh`,
      implausibleLRCount: implausibleCount,
    };
  }

  // Check if there's anything to adjust (unlocked subsystems)
  const adjustableSubsystems = activeSubsystems.filter(s => !s.lockedCapex);
  if (adjustableSubsystems.length === 0) {
    const implausibleCount = subsystems.filter(s => !s.disabled && s.lrOutOfRange).length;
    return {
      subsystems: subsystems.map(s => ({ ...s })),
      success: false,
      message: `All subsystems are locked. Unlock some to adjust learning rates.`,
      implausibleLRCount: implausibleCount,
    };
  }

  // Calculate how much cost reduction we need
  // LCOE = (CRF * CapEx + FixedOM) / Energy + VarOM
  // We need to reduce CapEx + FixedOM proportionally
  const costReductionRatio = targetLcoe / currentLcoe;

  // Distribute the reduction across unlocked subsystems weighted by idiot index
  const totalII = adjustableSubsystems.reduce((sum, s) => sum + s.baselineIdiotIndex, 0);

  // Apply learning rate adjustments
  const updatedSubsystems = subsystems.map(sub => {
    if (sub.disabled || sub.lockedCapex) {
      return { ...sub };
    }

    // Weight this subsystem's contribution by its idiot index
    const iiWeight = sub.baselineIdiotIndex / totalII;

    // Calculate target cost ratio for this subsystem
    // Higher II subsystems get more aggressive reduction
    const avgReduction = 1 - costReductionRatio;
    const thisReduction = avgReduction * (1 + (iiWeight * adjustableSubsystems.length - 1) * 0.5);
    const targetCostRatio = Math.max(0.1, 1 - thisReduction);

    // Calculate required learning rate to achieve this cost ratio
    // costRatio = LR^doublings, so LR = costRatio^(1/doublings)
    let newLR: number;
    if (doublings <= 0) {
      newLR = sub.learningRate; // Can't learn with no doublings
    } else {
      newLR = Math.pow(targetCostRatio, 1 / doublings);
    }

    // Clamp to bounds
    const lrBounds = getLearningRateBounds(sub.trl, sub.baselineIdiotIndex);
    newLR = Math.max(lrBounds.min, Math.min(lrBounds.max, newLR));

    // Compute new costs with this learning rate
    const newCapex = computeLearnedCost(sub.baselineCapitalCost, newLR, financialParams.unitsDeployed);
    const newOm = computeLearnedCost(sub.baselineFixedOm, newLR, financialParams.unitsDeployed);

    // Check if LR is out of plausible range
    const plausibleRange = getPlausibleLRRange(sub.trl);
    const lrOutOfRange = newLR < plausibleRange.min;

    return {
      ...sub,
      learningRate: newLR,
      absoluteCapitalCost: Math.round(newCapex),
      absoluteFixedOm: Math.round(newOm),
      lrOutOfRange,
    };
  });

  // Calculate new LCOE
  const activeUpdated = updatedSubsystems.filter(s => !s.disabled);
  const newCapexPerKw = activeUpdated.reduce(
    (sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0
  ) * fuelInfo.regulatoryModifier;
  const newOmPerKw = activeUpdated.reduce(
    (sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0
  );
  const newLcoe = (crf * newCapexPerKw + newOmPerKw) / energyPerKw + totalVariableOm;

  // Count implausible learning rates
  const implausibleLRCount = updatedSubsystems.filter(s => !s.disabled && s.lrOutOfRange).length;

  // Calculate totals for message
  const oldCapexTotal = activeSubsystems.reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
  const newCapexTotal = activeUpdated.reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
  const capexReduction = oldCapexTotal - newCapexTotal;

  const lockedCount = activeSubsystems.filter(s => s.lockedCapex).length;
  const lockedNote = lockedCount > 0 ? ` (${lockedCount} locked)` : '';
  const lrWarning = implausibleLRCount > 0 ? ` ${implausibleLRCount} subsystem(s) require aggressive learning rates.` : '';

  if (newLcoe > targetLcoe + 0.5) {
    return {
      subsystems: updatedSubsystems,
      success: false,
      message: `Partial: LCOE reduced to $${newLcoe.toFixed(2)}/MWh (target: $${targetLcoe}/MWh)${lockedNote}. CapEx -$${Math.round(capexReduction)}M.${lrWarning}`,
      implausibleLRCount,
    };
  }

  return {
    subsystems: updatedSubsystems,
    success: true,
    message: `Target achieved!${lockedNote} CapEx reduced by $${Math.round(capexReduction)}M to $${Math.round(newCapexTotal)}M. LCOE: $${newLcoe.toFixed(2)}/MWh${lrWarning}`,
    implausibleLRCount,
  };
}

/**
 * Get TRL description
 */
export function getTRLDescription(trl: number): string {
  const descriptions: Record<number, string> = {
    1: 'Basic principles observed',
    2: 'Technology concept formulated',
    3: 'Experimental proof of concept',
    4: 'Technology validated in lab',
    5: 'Technology validated in relevant environment',
    6: 'Technology demonstrated in relevant environment',
    7: 'System prototype demonstration',
    8: 'System complete and qualified',
    9: 'System proven in operational environment',
  };
  return descriptions[trl] || 'Unknown';
}
