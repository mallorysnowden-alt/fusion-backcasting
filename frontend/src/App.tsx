import { LCOEDisplay } from './components/LCOEDisplay';
import { FeasibilityIndicator } from './components/FeasibilityIndicator';
import { FuelTypeSelector } from './components/FuelTypeSelector';
import { ConfinementTypeSelector } from './components/ConfinementTypeSelector';
import { SubsystemPanel } from './components/SubsystemPanel';
import { SolveForButtons } from './components/SolveForButtons';
import { FinancialPanel } from './components/FinancialPanel';
import { useDarkMode } from './hooks/useDarkMode';

function App() {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Fusion <span className="text-fusion-500">Backcasting</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Explore what needs to be true for fusion to produce electricity at a target LCOE
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggle}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - LCOE Display & Feasibility */}
          <div className="lg:col-span-1 space-y-6">
            <LCOEDisplay />
            <FeasibilityIndicator />
            <SolveForButtons />
          </div>

          {/* Middle Column - Fuel Type, Confinement & Financial */}
          <div className="lg:col-span-1 space-y-6">
            <FuelTypeSelector />
            <ConfinementTypeSelector />
            <FinancialPanel />
          </div>

          {/* Right Column - Subsystems */}
          <div className="lg:col-span-1">
            <SubsystemPanel />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">About This Tool</h2>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p>
              This is a <strong>backcasting tool</strong> for exploring what needs to be true for
              fusion to achieve a target electricity cost. Unlike traditional LCOE calculators that
              compute costs from inputs, this tool treats the{' '}
              <strong>target LCOE as the binding constraint</strong> and helps you explore what
              parameter combinations could achieve it.
            </p>
            <p>
              Subsystem costs are set in <strong>absolute terms ($M)</strong> to reveal the non-linear
              nature of scaling. The $/kW values are calculated based on plant capacity and displayed
              alongside for reference.
            </p>
            <p>
              The subsystem structure follows the{' '}
              <a
                href="https://arxiv.org/abs/2601.21724"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fusion-600 dark:text-fusion-400 hover:text-fusion-700 dark:hover:text-fusion-300 underline font-semibold"
              >
                ARPA-E Fusion Cost Code (FCC)
              </a>{' '}
              Account 22+ framework. Each subsystem has a Technology Readiness Level (TRL) and an
              "Idiot Index" (ratio of cost to raw materials) indicating learning potential.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="font-medium text-gray-700 dark:text-gray-200">Idiot Index Guide</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                <div>1-2: Commodity (steel, concrete)</div>
                <div>2-5: Mature industrial</div>
                <div>5-10: Complex systems</div>
                <div>10+: High-tech, massive learning</div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="font-medium text-gray-700 dark:text-gray-200">TRL Guide</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                <div>1-3: Basic research</div>
                <div>4-6: Development</div>
                <div>7-8: Demonstration</div>
                <div>9: Commercial operation</div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="font-medium text-gray-700 dark:text-gray-200">Feasibility Colors</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Target achieved
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  Within 50% of target
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  More than 50% over target
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default App;
