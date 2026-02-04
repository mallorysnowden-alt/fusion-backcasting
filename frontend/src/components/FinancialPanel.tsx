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
          min={0.02}
          max={0.15}
          step={0.005}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          description="Weighted Average Cost of Capital"
          onChange={(value) => updateFinancialParams({ wacc: value })}
        />

        <SliderInput
          label="Plant Lifetime"
          value={financialParams.lifetime}
          min={20}
          max={60}
          step={5}
          format={(v) => `${v} years`}
          description="Economic lifetime for capital recovery"
          onChange={(value) => updateFinancialParams({ lifetime: value })}
        />

        <SliderInput
          label="Capacity Factor"
          value={financialParams.capacityFactor}
          min={0.5}
          max={0.98}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          description="Fraction of time at full output"
          onChange={(value) => updateFinancialParams({ capacityFactor: value })}
        />

        <SliderInput
          label="Plant Capacity"
          value={financialParams.capacityMw}
          min={100}
          max={2000}
          step={100}
          format={(v) => `${v} MW`}
          description="Nameplate electrical capacity"
          onChange={(value) => updateFinancialParams({ capacityMw: value })}
        />

        <SliderInput
          label="Construction Time"
          value={financialParams.constructionTime}
          min={3}
          max={10}
          step={1}
          format={(v) => `${v} years`}
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
  min,
  max,
  step,
  format,
  description,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  description: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-fusion-600 dark:text-fusion-400">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="text-xs text-gray-400 mt-1">{description}</div>
    </div>
  );
}
