/**
 * Client-side LCOE calculations for instant responsiveness.
 * These mirror the backend calculations for real-time slider updates.
 */

export interface Subsystem {
  account: string;
  name: string;
  absoluteCapitalCost: number;  // $M
  absoluteFixedOm: number;      // $M/yr
  variableOm: number;           // $/MWh
  trl: number;
  baselineIdiotIndex: number;   // Original idiot index at baseline cost
  baselineCapitalCost: number;  // Original capital cost for idiot index calculation
  baselineFixedOm: number;      // Original fixed O&M for proportional reduction
  learningRate: number;         // Learning curve rate (e.g., 0.85 = 15% cost reduction per doubling)
  required: boolean;
  disabled: boolean;
  description?: string;
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

export interface FinancialParams {
  wacc: number;
  lifetime: number;
  capacityFactor: number;
  capacityMw: number;
  constructionTime: number;
}

export interface FuelConstraints {
  requiredSubsystems: string[];
  disabledSubsystems: string[];
  cfModifier: number;
  regulatoryModifier: number;
  description: string;
}

export interface ConfinementConstraints {
  requiredSubsystems: string[];
  disabledSubsystems: string[];
  description: string;
}

export type FuelType = 'D-T' | 'D-He3' | 'p-B11';
export type ConfinementType = 'MCF' | 'ICF';

export const FUEL_CONSTRAINTS: Record<FuelType, FuelConstraints> = {
  'D-T': {
    requiredSubsystems: ['22.5', '23'],
    disabledSubsystems: ['22.1.9', '22.6'],
    cfModifier: 0.95,
    regulatoryModifier: 1.20,
    description: 'D-T fusion requires tritium breeding and thermal conversion. High neutron flux causes material damage (-5% CF) and requires additional regulatory compliance (+20% costs).',
  },
  'D-He3': {
    requiredSubsystems: ['22.6', '23'],
    disabledSubsystems: ['22.5'],
    cfModifier: 0.98,
    regulatoryModifier: 1.10,
    description: 'D-He3 fusion produces fewer neutrons, reducing material damage and regulatory burden. Requires He3 production infrastructure.',
  },
  'p-B11': {
    requiredSubsystems: ['22.1.9'],
    disabledSubsystems: ['22.5', '22.6', '23', '22.1.2'],
    cfModifier: 1.0,
    regulatoryModifier: 1.0,
    description: 'p-B11 is aneutronic, enabling direct energy conversion. No tritium handling, He3 production, or neutron shielding needed. Minimal regulatory burden, but requires much higher plasma temperatures.',
  },
};

export const CONFINEMENT_CONSTRAINTS: Record<ConfinementType, ConfinementConstraints> = {
  'MCF': {
    requiredSubsystems: ['22.1.3'],
    disabledSubsystems: ['22.1.8'],
    description: 'Magnetic Confinement Fusion (tokamak, stellarator, etc.) uses superconducting magnets to confine plasma.',
  },
  'ICF': {
    requiredSubsystems: ['22.1.8'],
    disabledSubsystems: ['22.1.3'],
    description: 'Inertial Confinement Fusion uses lasers or other drivers to compress and heat fuel pellets.',
  },
};

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
 */
export function calculateLCOE(
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType,
  _confinementType: ConfinementType
): LCOEBreakdown {
  const constraints = FUEL_CONSTRAINTS[fuelType];
  const effectiveCF = financialParams.capacityFactor * constraints.cfModifier;
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
  const hoursPerYear = 8760;
  const energyPerKw = (effectiveCF * hoursPerYear) / 1000; // MWh per kW per year

  let totalCapex = 0;
  let totalFixedOm = 0;
  let totalVariableOm = 0;
  const subsystemCapital: Record<string, number> = {};
  const subsystemOm: Record<string, number> = {};

  for (const sub of subsystems) {
    if (sub.disabled) continue;

    // Convert absolute costs to $/kW
    const capPerKw = capitalCostPerKw(sub.absoluteCapitalCost, financialParams.capacityMw);
    const omPerKw = fixedOmPerKw(sub.absoluteFixedOm, financialParams.capacityMw);

    totalCapex += capPerKw;
    totalFixedOm += omPerKw;
    totalVariableOm += sub.variableOm;

    const subCapitalContrib = (crf * capPerKw) / energyPerKw;
    const subOmContrib = omPerKw / energyPerKw + sub.variableOm;

    subsystemCapital[sub.account] = Math.round(subCapitalContrib * 100) / 100;
    subsystemOm[sub.account] = Math.round(subOmContrib * 100) / 100;
  }

  // Apply regulatory modifier
  totalCapex *= constraints.regulatoryModifier;

  const capitalContribution = (crf * totalCapex) / energyPerKw;
  const fixedOmContribution = totalFixedOm / energyPerKw;
  const variableOmContribution = totalVariableOm;
  const fuelContribution = 0;

  const totalLcoe = capitalContribution + fixedOmContribution + variableOmContribution + fuelContribution;

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
  const constraints = FUEL_CONSTRAINTS[fuelType];
  const effectiveCF = financialParams.capacityFactor * constraints.cfModifier;
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
  const energyPerKw = (effectiveCF * 8760) / 1000;

  const totalFixedOm = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0);
  const totalVariableOm = subsystems.filter(s => !s.disabled).reduce((sum, s) => sum + s.variableOm, 0);
  const currentCapexAbs = subsystems.filter(s => !s.disabled).reduce((sum, s) => sum + s.absoluteCapitalCost, 0);

  const maxCapexWithReg = ((targetLcoe - totalVariableOm) * energyPerKw - totalFixedOm) / crf;
  const maxCapexPerKw = maxCapexWithReg / constraints.regulatoryModifier;
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
  const constraints = FUEL_CONSTRAINTS[fuelType];
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);

  const totalCapex = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0)
    * constraints.regulatoryModifier;
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
  const requiredCf = requiredCfBase / constraints.cfModifier;

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
  const constraints = FUEL_CONSTRAINTS[fuelType];
  const effectiveCF = financialParams.capacityFactor * constraints.cfModifier;
  const energyPerKw = (effectiveCF * 8760) / 1000;

  const totalCapex = subsystems
    .filter(s => !s.disabled)
    .reduce((sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0)
    * constraints.regulatoryModifier;
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
 * Solve for target LCOE by adjusting subsystem costs.
 * Prioritizes reducing costs on subsystems with highest idiot index (most learning potential).
 * Reduces both capital AND O&M proportionally (O&M scales with capital via learning curve).
 * Returns updated subsystems with new costs.
 */
export function solveAndApplyTarget(
  targetLcoe: number,
  subsystems: Subsystem[],
  financialParams: FinancialParams,
  fuelType: FuelType
): { subsystems: Subsystem[]; success: boolean; message: string } {
  const constraints = FUEL_CONSTRAINTS[fuelType];
  const effectiveCF = financialParams.capacityFactor * constraints.cfModifier;
  const crf = calculateCRF(financialParams.wacc, financialParams.lifetime);
  const energyPerKw = (effectiveCF * 8760) / 1000;

  // Get active subsystems
  const activeSubsystems = subsystems.filter(s => !s.disabled);

  // Calculate current totals
  const currentCapexAbs = activeSubsystems.reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
  const currentOmAbs = activeSubsystems.reduce((sum, s) => sum + s.absoluteFixedOm, 0);
  const totalVariableOm = activeSubsystems.reduce((sum, s) => sum + s.variableOm, 0);

  // Convert to $/kW
  const currentCapexPerKw = activeSubsystems.reduce(
    (sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0
  ) * constraints.regulatoryModifier;
  const currentOmPerKw = activeSubsystems.reduce(
    (sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0
  );

  // Current LCOE
  const currentLcoe = (crf * currentCapexPerKw + currentOmPerKw) / energyPerKw + totalVariableOm;

  if (currentLcoe <= targetLcoe) {
    return {
      subsystems,
      success: true,
      message: `Already at or below target! Current LCOE $${currentLcoe.toFixed(2)}/MWh <= target $${targetLcoe}/MWh`,
    };
  }

  // We need to find a uniform scale factor 'r' such that:
  // (crf * capex * r * regulatory + om * r) / energy + variable_om = target_lcoe
  // r * (crf * capex * regulatory + om) = (target_lcoe - variable_om) * energy
  // r = (target_lcoe - variable_om) * energy / (crf * capex * regulatory + om)

  const numerator = (targetLcoe - totalVariableOm) * energyPerKw;
  const denominator = crf * currentCapexPerKw + currentOmPerKw;

  if (denominator <= 0) {
    return {
      subsystems,
      success: false,
      message: `Invalid configuration: no capital or O&M costs to reduce`,
    };
  }

  const uniformScaleFactor = numerator / denominator;

  if (uniformScaleFactor <= 0) {
    return {
      subsystems,
      success: false,
      message: `Impossible: Variable O&M ($${totalVariableOm.toFixed(2)}/MWh) exceeds target LCOE of $${targetLcoe}/MWh`,
    };
  }

  if (uniformScaleFactor >= 1) {
    return {
      subsystems,
      success: true,
      message: `Already at or below target! Scale factor ${uniformScaleFactor.toFixed(2)} >= 1.0`,
    };
  }

  // Minimum scale factor (can't reduce below 10% of baseline)
  const minScaleFactor = 0.10;

  // Instead of uniform scaling, weight by idiot index
  // Higher II subsystems get more reduction, lower II get less
  // We'll use weighted scaling: r_i = base_r * (II_i / avg_II)
  // But ensure we hit the target overall

  const totalWeight = activeSubsystems.reduce((sum, s) => sum + calculateIdiotIndex(s), 0);
  const avgWeight = totalWeight / activeSubsystems.length;

  // Calculate how much total cost reduction we need (capex + om combined)
  const totalReductionNeeded = (1 - uniformScaleFactor);

  // Apply weighted reductions
  const updatedSubsystems = subsystems.map(sub => {
    if (sub.disabled) return sub;

    const idiotIndex = calculateIdiotIndex(sub);
    // Weight factor: subsystems with higher II get reduced more
    const weightFactor = idiotIndex / avgWeight;

    // Calculate this subsystem's reduction factor
    // Higher weight = more reduction (lower scale factor)
    let scaleFactor = 1 - (totalReductionNeeded * weightFactor);

    // Clamp to minimum
    scaleFactor = Math.max(minScaleFactor, Math.min(1.0, scaleFactor));

    // Use floor to ensure we don't round up and overshoot the target
    const newCapitalCost = Math.floor(sub.absoluteCapitalCost * scaleFactor);
    // O&M scales proportionally with capital (maintains O&M % of capital)
    const newFixedOm = Math.floor(sub.absoluteFixedOm * scaleFactor);

    return {
      ...sub,
      absoluteCapitalCost: newCapitalCost,
      absoluteFixedOm: newFixedOm,
    };
  });

  // Verify we hit target - may need iterative adjustment
  let activeUpdated = updatedSubsystems.filter(s => !s.disabled);
  let newCapexPerKw = activeUpdated.reduce(
    (sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0
  ) * constraints.regulatoryModifier;
  let newOmPerKw = activeUpdated.reduce(
    (sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0
  );
  let newLcoe = (crf * newCapexPerKw + newOmPerKw) / energyPerKw + totalVariableOm;

  // If we're still above target, do uniform additional reduction on adjustable subsystems
  // Use tight tolerance - we want to be AT or BELOW target, not just close
  let iterations = 0;
  while (newLcoe > targetLcoe && iterations < 20) {
    const adjustable = updatedSubsystems.filter(s =>
      !s.disabled &&
      s.absoluteCapitalCost > s.baselineCapitalCost * minScaleFactor
    );

    if (adjustable.length === 0) break;

    // Calculate additional reduction needed - overshoot slightly to account for rounding
    const gapRatio = (targetLcoe - 0.005) / newLcoe;

    adjustable.forEach(sub => {
      const minCap = Math.floor(sub.baselineCapitalCost * minScaleFactor);
      const minOm = Math.floor(sub.baselineFixedOm * minScaleFactor);
      // Use floor to ensure we reduce enough
      sub.absoluteCapitalCost = Math.max(minCap, Math.floor(sub.absoluteCapitalCost * gapRatio));
      sub.absoluteFixedOm = Math.max(minOm, Math.floor(sub.absoluteFixedOm * gapRatio));
    });

    activeUpdated = updatedSubsystems.filter(s => !s.disabled);
    newCapexPerKw = activeUpdated.reduce(
      (sum, s) => sum + capitalCostPerKw(s.absoluteCapitalCost, financialParams.capacityMw), 0
    ) * constraints.regulatoryModifier;
    newOmPerKw = activeUpdated.reduce(
      (sum, s) => sum + fixedOmPerKw(s.absoluteFixedOm, financialParams.capacityMw), 0
    );
    newLcoe = (crf * newCapexPerKw + newOmPerKw) / energyPerKw + totalVariableOm;
    iterations++;
  }

  const finalCapexAbs = activeUpdated.reduce((sum, s) => sum + s.absoluteCapitalCost, 0);
  const finalOmAbs = activeUpdated.reduce((sum, s) => sum + s.absoluteFixedOm, 0);
  const capexReduction = currentCapexAbs - finalCapexAbs;
  const omReduction = currentOmAbs - finalOmAbs;

  if (newLcoe > targetLcoe + 0.5) {
    return {
      subsystems: updatedSubsystems,
      success: false,
      message: `Partial reduction: LCOE reduced to $${newLcoe.toFixed(2)}/MWh (target: $${targetLcoe}/MWh). CapEx -$${Math.round(capexReduction)}M, O&M -$${Math.round(omReduction)}M/yr. Further reduction requires parameter changes.`,
    };
  }

  return {
    subsystems: updatedSubsystems,
    success: true,
    message: `Hit target! CapEx -$${Math.round(capexReduction)}M (to $${Math.round(finalCapexAbs)}M), O&M -$${Math.round(omReduction)}M/yr (to $${Math.round(finalOmAbs)}M/yr). LCOE: $${newLcoe.toFixed(2)}/MWh`,
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
