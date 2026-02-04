import { useFusionStore } from '../store';
import { Subsystem, getLearningPotential, getTRLDescription, capitalCostPerKw, fixedOmPerKw, calculateIdiotIndex, calculateLearningCurveProgress, getLearningRateDescription, omPercentOfCapital } from '../utils/calculations';

interface SubsystemCardProps {
  subsystem: Subsystem;
}

export function SubsystemCard({ subsystem }: SubsystemCardProps) {
  const { updateSubsystem, lcoeBreakdown, financialParams } = useFusionStore();

  const capitalContrib = lcoeBreakdown.subsystemCapital[subsystem.account] || 0;
  const omContrib = lcoeBreakdown.subsystemOm[subsystem.account] || 0;
  const totalContrib = capitalContrib + omContrib;

  // Calculate $/kW values from absolute costs
  const capPerKw = capitalCostPerKw(subsystem.absoluteCapitalCost, financialParams.capacityMw);
  const omPerKw = fixedOmPerKw(subsystem.absoluteFixedOm, financialParams.capacityMw);

  // O&M as percentage of capital
  const omPctOfCapital = omPercentOfCapital(subsystem);

  // Calculate current idiot index based on cost reduction
  const baselineII = subsystem.baselineIdiotIndex;
  const currentIdiotIndex = calculateIdiotIndex(subsystem);
  const learningProgress = calculateLearningCurveProgress(subsystem);

  const trlColor = subsystem.trl >= 7 ? 'bg-green-500' : subsystem.trl >= 5 ? 'bg-yellow-500' : 'bg-red-500';
  const baselineIIColor =
    baselineII <= 2
      ? 'text-gray-400'
      : baselineII <= 5
      ? 'text-blue-400'
      : baselineII <= 10
      ? 'text-purple-400'
      : 'text-red-400';
  const currentIIColor =
    currentIdiotIndex <= 2
      ? 'text-gray-600'
      : currentIdiotIndex <= 5
      ? 'text-blue-600'
      : currentIdiotIndex <= 10
      ? 'text-purple-600'
      : 'text-red-600';

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
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${subsystem.required ? 'border-fusion-300 dark:border-fusion-600 bg-fusion-50/30 dark:bg-fusion-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
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

      {/* TRL and Idiot Index */}
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
          <span className="text-gray-500 dark:text-gray-400">Idiot Index:</span>
          <span className={`${baselineIIColor}`} title="Baseline (current technology)">{baselineII.toFixed(1)}</span>
          {learningProgress.isReduction && (
            <>
              <span className="text-gray-400">&rarr;</span>
              <span className={`font-semibold ${currentIIColor}`} title="With cost reduction">{currentIdiotIndex.toFixed(1)}</span>
            </>
          )}
          <span className="text-xs text-gray-400">({getLearningPotential(currentIdiotIndex).split(' ')[0]})</span>
        </div>
      </div>

      {/* Learning Curve Info - shown when cost is reduced */}
      {learningProgress.isReduction && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-800 dark:text-green-200">
                {learningProgress.costReductionPct.toFixed(0)}% cost reduction
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Requires ~{learningProgress.doublings.toFixed(1)} doublings ({learningProgress.unitsNeeded.toLocaleString()} units)
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Learning Rate</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{(subsystem.learningRate * 100).toFixed(0)}%</div>
              <div className="text-xs text-gray-400">{getLearningRateDescription(subsystem.learningRate).split(' ')[0]}</div>
            </div>
          </div>
        </div>
      )}

      {/* Absolute Cost Sliders */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Capital Cost</span>
            <div className="text-right">
              <span className="font-semibold dark:text-gray-200">${subsystem.absoluteCapitalCost}M</span>
              <span className="text-gray-400 text-xs ml-2">(${Math.round(capPerKw)}/kW)</span>
            </div>
          </div>
          <SliderWithDefault
            min={0}
            max={Math.max(2000, subsystem.absoluteCapitalCost * 2, subsystem.baselineCapitalCost * 1.5)}
            step={10}
            value={subsystem.absoluteCapitalCost}
            defaultValue={subsystem.baselineCapitalCost}
            formatDefault={(v) => `$${v}M`}
            onChange={(v) => updateSubsystem(subsystem.account, { absoluteCapitalCost: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Fixed O&M</span>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded" title="O&M as % of Capital Cost">
                {omPctOfCapital.toFixed(1)}% of CapEx
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold dark:text-gray-200">${subsystem.absoluteFixedOm}M/yr</span>
              <span className="text-gray-400 text-xs ml-2">(${Math.round(omPerKw)}/kW-yr)</span>
            </div>
          </div>
          <SliderWithDefault
            min={0}
            max={Math.max(100, subsystem.absoluteFixedOm * 2, subsystem.baselineFixedOm * 1.5)}
            step={1}
            value={subsystem.absoluteFixedOm}
            defaultValue={subsystem.baselineFixedOm}
            formatDefault={(v) => `$${v}M`}
            onChange={(v) => updateSubsystem(subsystem.account, { absoluteFixedOm: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Learning Rate</span>
              <span className="text-xs text-gray-400">({getLearningRateDescription(subsystem.learningRate)})</span>
            </div>
            <div className="text-right">
              <span className="font-semibold dark:text-gray-200">{(subsystem.learningRate * 100).toFixed(0)}%</span>
              <span className="text-gray-400 text-xs ml-2">({((1 - subsystem.learningRate) * 100).toFixed(0)}% reduction/doubling)</span>
            </div>
          </div>
          <input
            type="range"
            min={70}
            max={98}
            step={1}
            value={subsystem.learningRate * 100}
            onChange={(e) => updateSubsystem(subsystem.account, { learningRate: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </div>
      </div>

      {subsystem.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{subsystem.description}</p>
      )}
    </div>
  );
}

// Slider with visual indicator for default value
function SliderWithDefault({
  min,
  max,
  step,
  value,
  defaultValue,
  formatDefault,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
  formatDefault: (v: number) => string;
  onChange: (v: number) => void;
}) {
  // Calculate position percentage for the default marker
  const defaultPct = ((defaultValue - min) / (max - min)) * 100;
  const isAtDefault = Math.abs(value - defaultValue) < step;

  return (
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {/* Default value marker */}
      <div
        className="absolute top-0 h-4 flex flex-col items-center pointer-events-none"
        style={{ left: `calc(${defaultPct}% - 1px)` }}
      >
        <div className={`w-0.5 h-4 ${isAtDefault ? 'bg-fusion-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
      </div>
      {/* Default label below slider */}
      {!isAtDefault && (
        <div
          className="absolute top-5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pointer-events-none transform -translate-x-1/2"
          style={{ left: `${defaultPct}%` }}
        >
          ↑ {formatDefault(defaultValue)}
        </div>
      )}
    </div>
  );
}
