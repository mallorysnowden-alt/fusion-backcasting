import { useFusionStore } from '../store';

export function LCOEDisplay() {
  const { lcoeBreakdown, targetLcoe, setTargetLcoe, isTargetAttainable, minimumAttainableLcoe } = useFusionStore();

  const bgColor = isTargetAttainable
    ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
    : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';

  const textColor = isTargetAttainable
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className={`rounded-xl border-2 p-6 ${bgColor}`}>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Target LCOE
        </div>
        <div className={`text-6xl font-bold ${textColor}`}>
          ${targetLcoe}
        </div>
        <div className="text-xl text-gray-600 dark:text-gray-400 mt-1">/MWh</div>

        {!isTargetAttainable && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
            <div className="text-sm text-red-600 dark:text-red-400">
              Minimum achievable:
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              ${minimumAttainableLcoe.toFixed(2)}/MWh
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Adjust Target LCOE</label>
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={targetLcoe}
            onChange={(e) => setTargetLcoe(Number(e.target.value))}
            className="w-full max-w-xs"
          />
          <div className="relative max-w-xs mx-auto mt-1 h-4">
            <span className="absolute text-xs text-gray-400" style={{ left: '0%', transform: 'translateX(0)' }}>$5</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '26.3%', transform: 'translateX(-50%)' }}>$30</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '52.6%', transform: 'translateX(-50%)' }}>$55</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '78.9%', transform: 'translateX(-50%)' }}>$80</span>
            <span className="absolute text-xs text-gray-400" style={{ left: '100%', transform: 'translateX(-100%)' }}>$100</span>
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
