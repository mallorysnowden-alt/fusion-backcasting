import { useFusionStore } from '../store';

export function FinancialPanel() {
  const { financialParams, updateFinancialParams } = useFusionStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Financial Parameters</h3>

      <div className="space-y-4">
        <SliderInput
          label="WACC"
          value={financialParams.wacc}
          defaultValue={0.08}
          min={0.02}
          max={0.15}
          step={0.005}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          formatDefault={(v) => `${(v * 100).toFixed(0)}%`}
          description="Weighted Average Cost of Capital"
          onChange={(value) => updateFinancialParams({ wacc: value })}
        />

        <SliderInput
          label="Plant Lifetime"
          value={financialParams.lifetime}
          defaultValue={40}
          min={20}
          max={60}
          step={5}
          format={(v) => `${v} years`}
          formatDefault={(v) => `${v}yr`}
          description="Economic lifetime for capital recovery"
          onChange={(value) => updateFinancialParams({ lifetime: value })}
        />

        <SliderInput
          label="Capacity Factor"
          value={financialParams.capacityFactor}
          defaultValue={0.90}
          min={0.5}
          max={0.98}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          formatDefault={(v) => `${(v * 100).toFixed(0)}%`}
          description="Fraction of time at full output"
          onChange={(value) => updateFinancialParams({ capacityFactor: value })}
        />

        <SliderInput
          label="Plant Capacity"
          value={financialParams.capacityMw}
          defaultValue={1000}
          min={100}
          max={2000}
          step={100}
          format={(v) => `${v} MW`}
          formatDefault={(v) => `${v}MW`}
          description="Nameplate electrical capacity"
          onChange={(value) => updateFinancialParams({ capacityMw: value })}
        />

        <SliderInput
          label="Construction Time"
          value={financialParams.constructionTime}
          defaultValue={5}
          min={3}
          max={10}
          step={1}
          format={(v) => `${v} years`}
          formatDefault={(v) => `${v}yr`}
          description="Time from groundbreaking to operation"
          onChange={(value) => updateFinancialParams({ constructionTime: value })}
        />
      </div>

      {/* Quick reference */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="font-medium mb-2">Reference Values:</div>
          <div className="grid grid-cols-2 gap-2">
            <div>Nuclear (existing): 6-8% WACC</div>
            <div>Wind/Solar: 5-7% WACC</div>
            <div>Nuclear CF: 85-93%</div>
            <div>Wind CF: 25-45%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderInput({
  label,
  value,
  defaultValue,
  min,
  max,
  step,
  format,
  formatDefault,
  description,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  formatDefault: (v: number) => string;
  description: string;
  onChange: (value: number) => void;
}) {
  const defaultPct = ((defaultValue - min) / (max - min)) * 100;
  const isAtDefault = Math.abs(value - defaultValue) < step;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-fusion-600 dark:text-fusion-400">{format(value)}</span>
      </div>
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
      <div className={`text-xs text-gray-400 ${!isAtDefault ? 'mt-5' : 'mt-1'}`}>{description}</div>
    </div>
  );
}
