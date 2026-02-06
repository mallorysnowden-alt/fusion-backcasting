import { useState } from 'react';
import { useFusionStore } from '../store';
import { SubsystemCard } from './SubsystemCard';

export function SubsystemPanel() {
  const { subsystems, resetToDefaults, totalCapexAbs, totalCapexPerKw } = useFusionStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Group subsystems by category
  const groups = [
    {
      title: 'Fusion Core (Account 22.1)',
      accounts: ['22.1.1', '22.1.2', '22.1.3', '22.1.5', '22.1.6', '22.1.7', '22.1.8', '22.1.9'],
    },
    {
      title: 'Fuel Handling (Account 22.5-22.6)',
      accounts: ['22.5', '22.6'],
    },
    {
      title: 'Power Conversion (Accounts 23-26)',
      accounts: ['23', '24-26'],
    },
  ];

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <div>
      {/* Subsystem Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Subsystem Costs</h3>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium text-gray-800 dark:text-gray-200">${totalCapexAbs.toLocaleString()}M</span>
              <span className="text-gray-400 dark:text-gray-500 ml-1">total</span>
            </div>
            <div className="text-gray-300 dark:text-gray-600">|</div>
            <div>
              <span className="font-medium text-gray-800 dark:text-gray-200">${Math.round(totalCapexPerKw).toLocaleString()}/kW</span>
              <span className="text-gray-400 dark:text-gray-500 ml-1">specific</span>
            </div>
          </div>
        </div>

        <div className="divide-y dark:divide-gray-700">
        {groups.map((group) => {
          const groupSubsystems = subsystems.filter((s) => group.accounts.includes(s.account));
          const isCollapsed = collapsed.has(group.title);
          const activeCount = groupSubsystems.filter((s) => !s.disabled).length;
          const groupCapexAbs = groupSubsystems
            .filter((s) => !s.disabled)
            .reduce((sum, s) => sum + s.absoluteCapitalCost, 0);

          return (
            <div key={group.title}>
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`transform transition-transform dark:text-gray-400 ${isCollapsed ? '' : 'rotate-90'}`}
                  >
                    ▶
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{group.title}</span>
                  <span className="text-sm text-gray-400">({activeCount} active)</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">${groupCapexAbs.toLocaleString()}M</span>
              </button>

              {!isCollapsed && (
                <div className="p-4 pt-0 grid gap-3">
                  {groupSubsystems.map((subsystem) => (
                    <SubsystemCard key={subsystem.account} subsystem={subsystem} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
