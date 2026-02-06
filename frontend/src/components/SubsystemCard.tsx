import { useFusionStore } from '../store';
import { Subsystem, getLearningPotential, getTRLDescription, capitalCostPerKw, fixedOmPerKw, getPlausibleLRRange } from '../utils/calculations';

interface SubsystemCardProps {
  subsystem: Subsystem;
}

export function SubsystemCard({ subsystem }: SubsystemCardProps) {
  const { lcoeBreakdown, financialParams } = useFusionStore();

  const capitalContrib = lcoeBreakdown.subsystemCapital[subsystem.account] || 0;
  const omContrib = lcoeBreakdown.subsystemOm[subsystem.account] || 0;
  const totalContrib = capitalContrib + omContrib;

  // Calculate $/kW values from learned costs (Nth unit)
  const learnedCapPerKw = capitalCostPerKw(subsystem.absoluteCapitalCost, financialParams.capacityMw);

  // Calculate $/kW values from baseline costs (first unit)
  const baselineCapPerKw = capitalCostPerKw(subsystem.baselineCapitalCost, financialParams.capacityMw);

  // Cost reduction percentage
  const costReductionPct = subsystem.baselineCapitalCost > 0
    ? ((subsystem.baselineCapitalCost - subsystem.absoluteCapitalCost) / subsystem.baselineCapitalCost) * 100
    : 0;
  const hasReduction = costReductionPct > 1;

  // Learning rate info
  const plausibleRange = getPlausibleLRRange(subsystem.trl);
  const lrReductionPerDoubling = (1 - subsystem.learningRate) * 100;

  const trlColor = subsystem.trl >= 7 ? 'bg-green-500' : subsystem.trl >= 5 ? 'bg-yellow-500' : 'bg-red-500';

  // OPEX as % of CAPEX
  const opexPctOfCapex = subsystem.absoluteCapitalCost > 0
    ? (subsystem.absoluteFixedOm / subsystem.absoluteCapitalCost) * 100
    : 0;

  if (subsystem.disabled) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 opacity-60">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-mono">{subsystem.account}</span>
            <h4 className="font-medium text-gray-500 dark:text-gray-400">{subsystem.name}</h4>
          </div>
          <span className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">Disabled</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Not applicable for selected fuel/confinement type</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${
      subsystem.lrOutOfRange
        ? 'border-red-400 dark:border-red-600 bg-red-50/30 dark:bg-red-900/10'
        : subsystem.required
          ? 'border-fusion-300 dark:border-fusion-600 bg-fusion-50/30 dark:bg-fusion-900/20'
          : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">{subsystem.account}</span>
            {subsystem.required && (
              <span className="text-xs bg-fusion-100 dark:bg-fusion-900/50 text-fusion-700 dark:text-fusion-300 px-2 py-0.5 rounded">Required</span>
            )}
          </div>
          <h4 className="font-medium text-gray-800 dark:text-gray-100">{subsystem.name}</h4>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">${totalContrib.toFixed(2)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">/MWh</div>
        </div>
      </div>

      {/* TRL and Idiot Index Info */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">TRL:</span>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${trlColor}`} />
            <span className="font-medium dark:text-gray-200">{subsystem.trl}</span>
          </div>
          <span className="text-xs text-gray-400" title={getTRLDescription(subsystem.trl)}>
            ({getTRLDescription(subsystem.trl).split(' ').slice(0, 2).join(' ')}...)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">II:</span>
          <span className="font-medium dark:text-gray-200">{subsystem.baselineIdiotIndex.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({getLearningPotential(subsystem.baselineIdiotIndex).split(' ')[0]})</span>
        </div>
      </div>

      {/* Learning Rate & Cost Summary */}
      <div className={`rounded-lg p-3 mb-4 border ${
        subsystem.lrOutOfRange
          ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-200 dark:border-red-800'
          : hasReduction
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-medium ${
              subsystem.lrOutOfRange
                ? 'text-red-800 dark:text-red-200'
                : hasReduction
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-700 dark:text-gray-300'
            }`}>
              Learning Rate: {(subsystem.learningRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lrReductionPerDoubling.toFixed(0)}% cost reduction per doubling
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              TRL {subsystem.trl} range: {(plausibleRange.min * 100).toFixed(0)}-{(plausibleRange.max * 100).toFixed(0)}%
              {subsystem.lrOutOfRange && (
                <span className="text-red-500 ml-1">(below threshold)</span>
              )}
            </div>
          </div>
          <div className="text-right">
            {hasReduction ? (
              <>
                <div className="text-xs text-gray-500 dark:text-gray-400">After {financialParams.unitsDeployed} units</div>
                <div className={`text-sm font-medium ${
                  subsystem.lrOutOfRange ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                }`}>
                  {costReductionPct.toFixed(0)}% reduction
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ${Math.round(learnedCapPerKw)}/kW
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 dark:text-gray-400">Baseline cost</div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ${Math.round(baselineCapPerKw)}/kW
                </div>
              </>
            )}
          </div>
        </div>
        {subsystem.lrOutOfRange && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Required LR is unrealistically high
          </div>
        )}
      </div>

      {/* Computed Costs Display */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CapEx</div>
          <div className="font-semibold text-gray-800 dark:text-gray-100">
            ${subsystem.absoluteCapitalCost}M
          </div>
          <div className="text-xs text-gray-400">
            ${Math.round(learnedCapPerKw)}/kW
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fixed O&M</div>
          <div className="font-semibold text-gray-800 dark:text-gray-100">
            ${subsystem.absoluteFixedOm}M/yr
          </div>
          <div className="text-xs text-gray-400">
            ${Math.round(fixedOmPerKw(subsystem.absoluteFixedOm, financialParams.capacityMw))}/kW-yr
          </div>
        </div>
      </div>
      <div className="text-xs text-green-600 dark:text-green-400 mt-2 text-center font-medium">
        O&M: {opexPctOfCapex.toFixed(1)}% of CapEx
      </div>

      {subsystem.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{subsystem.description}</p>
      )}
    </div>
  );
}
