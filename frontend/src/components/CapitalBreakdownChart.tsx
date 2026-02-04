import { useFusionStore } from '../store';
import { capitalCostPerKw } from '../utils/calculations';

// Color palette for subsystems
const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-lime-500',
  'bg-fuchsia-500',
];

export function CapitalBreakdownChart() {
  const { subsystems, totalCapexAbs, totalCapexPerKw, financialParams } = useFusionStore();

  // Get active subsystems sorted by capital cost (descending)
  const activeSubsystems = subsystems
    .filter(s => !s.disabled && s.absoluteCapitalCost > 0)
    .sort((a, b) => b.absoluteCapitalCost - a.absoluteCapitalCost);

  if (activeSubsystems.length === 0 || totalCapexAbs === 0) {
    return null;
  }

  const capacityMw = financialParams.capacityMw;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4 mb-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Capital Cost Breakdown</h3>

      {/* Stacked horizontal bar */}
      <div className="h-8 rounded-lg overflow-hidden flex mb-4">
        {activeSubsystems.map((sub, idx) => {
          const pct = (sub.absoluteCapitalCost / totalCapexAbs) * 100;
          if (pct < 0.5) return null; // Skip very small segments
          return (
            <div
              key={sub.account}
              className={`${COLORS[idx % COLORS.length]} relative group cursor-pointer transition-opacity hover:opacity-80`}
              style={{ width: `${pct}%` }}
              title={`${sub.name}: $${sub.absoluteCapitalCost}M (${pct.toFixed(1)}%)`}
            >
              {pct > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-1">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend with individual bars */}
      <div className="space-y-2">
        {activeSubsystems.map((sub, idx) => {
          const pct = (sub.absoluteCapitalCost / totalCapexAbs) * 100;
          const perKw = capitalCostPerKw(sub.absoluteCapitalCost, capacityMw);
          return (
            <div key={sub.account} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${COLORS[idx % COLORS.length]} flex-shrink-0`} />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-32 truncate" title={sub.name}>
                {sub.name}
              </span>
              <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full ${COLORS[idx % COLORS.length]} opacity-70`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 text-right">
                ${sub.absoluteCapitalCost}M
              </span>
              <span className="text-xs text-gray-400 w-16 text-right">
                ${Math.round(perKw)}/kW
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t dark:border-gray-700 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Capital</span>
        <div className="text-right">
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">${totalCapexAbs.toLocaleString()}M</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">(${Math.round(totalCapexPerKw).toLocaleString()}/kW)</span>
        </div>
      </div>
    </div>
  );
}
