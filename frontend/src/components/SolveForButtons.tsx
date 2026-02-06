import { useState } from 'react';
import { useFusionStore } from '../store';
import {
  solveForCapex,
  solveForCapacityFactor,
  solveForWacc,
} from '../utils/calculations';

type SolverParam = 'capex' | 'capacity_factor' | 'wacc';

interface SolverResult {
  value: number;
  feasible: boolean;
  explanation: string;
  perKw?: number;
}

export function SolveForButtons() {
  const {
    targetLcoe,
    subsystems,
    financialParams,
    fuelType,
  } = useFusionStore();

  const [activeResult, setActiveResult] = useState<{ param: SolverParam; result: SolverResult } | null>(null);

  const solvers: { param: SolverParam; label: string; icon: string }[] = [
    { param: 'capex', label: 'CapEx', icon: '$' },
    { param: 'capacity_factor', label: 'Capacity Factor', icon: '%' },
    { param: 'wacc', label: 'WACC', icon: 'r' },
  ];

  const handleSolve = (param: SolverParam) => {
    let result: SolverResult;

    switch (param) {
      case 'capex':
        result = solveForCapex(targetLcoe, subsystems, financialParams, fuelType);
        break;
      case 'capacity_factor':
        result = solveForCapacityFactor(targetLcoe, subsystems, financialParams, fuelType);
        break;
      case 'wacc':
        result = solveForWacc(targetLcoe, subsystems, financialParams, fuelType);
        break;
      default:
        return;
    }

    setActiveResult({ param, result });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Solve for Target</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        What parameter values would achieve ${targetLcoe}/MWh?
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {solvers.map(({ param, label, icon }) => (
          <button
            key={param}
            onClick={() => handleSolve(param)}
            className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
              activeResult?.param === param
                ? 'border-fusion-500 bg-fusion-50 dark:bg-fusion-900/30 text-fusion-700 dark:text-fusion-300'
                : 'border-gray-200 dark:border-gray-600 hover:border-fusion-300 text-gray-600 dark:text-gray-300'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs flex items-center justify-center font-mono">
              {icon}
            </span>
            {label}
          </button>
        ))}
      </div>

      {activeResult && (
        <div
          className={`p-4 rounded-lg ${
            activeResult.result.feasible
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                activeResult.result.feasible
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {activeResult.result.feasible ? '✓' : '!'}
            </div>
            <div>
              <div
                className={`font-medium ${
                  activeResult.result.feasible ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}
              >
                {activeResult.result.feasible ? 'Feasible' : 'Challenging'}
              </div>
              <p
                className={`text-sm mt-1 ${
                  activeResult.result.feasible ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}
              >
                {activeResult.result.explanation}
              </p>

              {activeResult.param === 'capex' && activeResult.result.value > 0 && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Required CapEx:</span>{' '}
                  <span className="font-semibold dark:text-gray-200">${activeResult.result.value.toLocaleString()}M</span>
                  {activeResult.result.perKw && (
                    <span className="text-gray-400 ml-2">(${activeResult.result.perKw.toLocaleString()}/kW)</span>
                  )}
                </div>
              )}
              {activeResult.param === 'capacity_factor' &&
                activeResult.result.value <= 1 && (
                  <div className="mt-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Required CF:</span>{' '}
                    <span className="font-semibold dark:text-gray-200">
                      {(activeResult.result.value * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              {activeResult.param === 'wacc' && activeResult.result.value > 0 && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Required WACC:</span>{' '}
                  <span className="font-semibold dark:text-gray-200">
                    {(activeResult.result.value * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
