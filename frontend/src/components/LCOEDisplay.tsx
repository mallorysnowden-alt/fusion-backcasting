import { useFusionStore } from '../store';

export function LCOEDisplay() {
  const { lcoeBreakdown, targetLcoe, setTargetLcoe, feasibility } = useFusionStore();

  const statusColors = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  const bgColors = {
    green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${bgColors[feasibility.status]}`}>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Calculated LCOE
        </div>
        <div className={`text-6xl font-bold ${statusColors[feasibility.status]}`}>
          ${lcoeBreakdown.totalLcoe.toFixed(2)}
        </div>
        <div className="text-xl text-gray-600 dark:text-gray-400 mt-1">/MWh</div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Target:</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold dark:text-gray-200">${targetLcoe}</span>
            <span className="text-gray-400">/MWh</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Adjust Target LCOE</label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={targetLcoe}
            onChange={(e) => setTargetLcoe(Number(e.target.value))}
            className="w-full max-w-xs"
          />
          {/* Labels positioned to match their actual slider positions */}
          <div className="relative max-w-xs mx-auto mt-1 h-4">
            <span className="absolute text-xs text-gray-400" style={{ left: '0%', transform: 'translateX(0)' }}>$5</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '11.1%', transform: 'translateX(-50%)' }}>$10</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '33.3%', transform: 'translateX(-50%)' }}>$20</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '55.6%', transform: 'translateX(-50%)' }}>$30</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '100%', transform: 'translateX(-100%)' }}>$50</span>
          </div>
        </div>
      </div>

      {/* LCOE Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Cost Breakdown</div>
        <div className="space-y-2">
          <BreakdownBar
            label="Capital"
            value={lcoeBreakdown.capitalContribution}
            total={lcoeBreakdown.totalLcoe}
            color="bg-blue-500"
          />
          <BreakdownBar
            label="Fixed O&M"
            value={lcoeBreakdown.fixedOmContribution}
            total={lcoeBreakdown.totalLcoe}
            color="bg-purple-500"
          />
          <BreakdownBar
            label="Variable O&M"
            value={lcoeBreakdown.variableOmContribution}
            total={lcoeBreakdown.totalLcoe}
            color="bg-orange-500"
          />
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-gray-600 dark:text-gray-400">{label}</div>
      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-20 text-right text-xs text-gray-600 dark:text-gray-400">
        ${value.toFixed(2)} ({percentage.toFixed(0)}%)
      </div>
    </div>
  );
}
