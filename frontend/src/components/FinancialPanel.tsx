import { useFusionStore } from '../store';
import { calculatePowerBalance } from '../utils/calculations';

// Logarithmic scale helpers for units deployed slider (2 to 10,000)
const MIN_UNITS_LOG = Math.log10(2); // log10(2) ≈ 0.301
const MAX_UNITS_LOG = 4; // log10(10000) = 4

function unitsToSlider(units: number): number {
  return Math.log10(Math.max(2, units));
}

function sliderToUnits(sliderValue: number): number {
  return Math.max(2, Math.round(Math.pow(10, sliderValue)));
}

export function FinancialPanel() {
  const { financialParams, updateFinancialParams } = useFusionStore();

  const powerBalance = calculatePowerBalance(financialParams.capacityMw, financialParams.qEng);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Technoeconomic Parameters</h3>

      <div className="space-y-4">
        <SliderInput
          label="Q_eng"
          value={financialParams.qEng}
          defaultValue={10}
          min={1.5}
          max={50}
          step={0.5}
          format={(v) => `${v.toFixed(1)}`}
          formatDefault={(v) => `${v}`}
          description="Net engineering energy gain (P_gross / P_recirc)"
          onChange={(value) => updateFinancialParams({ qEng: value })}
        />

        {/* Power balance info box */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-3 py-2 text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>P_fus (thermal):</span>
            <span className="font-medium">{Math.round(powerBalance.pFus).toLocaleString()} MW_th</span>
          </div>
          <div className="flex justify-between">
            <span>P_net (sold):</span>
            <span className="font-medium">{powerBalance.pNet.toLocaleString()} MW</span>
          </div>
          <div className="flex justify-between">
            <span>P_gross:</span>
            <span className="font-medium">{Math.round(powerBalance.pGross).toLocaleString()} MW</span>
          </div>
          <div className="flex justify-between">
            <span>P_recirc:</span>
            <span className="font-medium">{Math.round(powerBalance.pRecirc).toLocaleString()} MW</span>
          </div>
          <div className="flex justify-between">
            <span>Recirc. fraction:</span>
            <span className="font-medium">{(powerBalance.fRecirc * 100).toFixed(1)}%</span>
          </div>
        </div>

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
          description="Net electrical output (P_net)"
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

        {/* Units Deployed - Logarithmic Scale Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Units Deployed</span>
            <span className="text-sm font-semibold text-fusion-600 dark:text-fusion-400">
              {financialParams.unitsDeployed.toLocaleString()} units
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={MIN_UNITS_LOG}
              max={MAX_UNITS_LOG}
              step={0.01}
              value={unitsToSlider(financialParams.unitsDeployed)}
              onChange={(e) => updateFinancialParams({ unitsDeployed: sliderToUnits(Number(e.target.value)) })}
              className="w-full"
            />
            {/* Default value marker at 100 units (log10(100) = 2) */}
            <div
              className="absolute top-0 h-4 flex flex-col items-center pointer-events-none"
              style={{ left: `calc(${(2 / MAX_UNITS_LOG) * 100}% + ${7 - (2 / MAX_UNITS_LOG) * 100 * 0.14}px)` }}
            >
              <div className={`w-0.5 h-4 ${Math.abs(financialParams.unitsDeployed - 100) < 10 ? 'bg-fusion-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
            </div>
            {Math.abs(financialParams.unitsDeployed - 100) >= 10 && (
              <div
                className="absolute top-5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pointer-events-none transform -translate-x-1/2"
                style={{ left: `calc(${(2 / MAX_UNITS_LOG) * 100}% + ${7 - (2 / MAX_UNITS_LOG) * 100 * 0.14}px)` }}
              >
                ↑ 100
              </div>
            )}
          </div>
          <div className={`text-xs text-gray-400 ${Math.abs(financialParams.unitsDeployed - 100) >= 10 ? 'mt-5' : 'mt-1'}`}>
            Fleet deployment count
          </div>
        </div>
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
            <div>ITER Q_eng: ~2-3</div>
            <div>ARC/SPARC target: ~5-10</div>
            <div>Commercial target: 10-25</div>
            <div>Fission equiv.: ~40+</div>
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
  // Adjust for thumb width (~16px) - track is inset by 8px on each side
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
        {/* Default value marker - adjusted for thumb width (~14px) */}
        <div
          className="absolute top-0 h-4 flex flex-col items-center pointer-events-none"
          style={{ left: `calc(${defaultPct}% + ${7 - defaultPct * 0.14}px)` }}
        >
          <div className={`w-0.5 h-4 ${isAtDefault ? 'bg-fusion-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
        </div>
        {/* Default label below slider */}
        {!isAtDefault && (
          <div
            className="absolute top-5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pointer-events-none transform -translate-x-1/2"
            style={{ left: `calc(${defaultPct}% + ${7 - defaultPct * 0.14}px)` }}
          >
            ↑ {formatDefault(defaultValue)}
          </div>
        )}
      </div>
      <div className={`text-xs text-gray-400 ${!isAtDefault ? 'mt-5' : 'mt-1'}`}>{description}</div>
    </div>
  );
}
