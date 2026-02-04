import { useFusionStore } from '../store';

export function FeasibilityIndicator() {
  const { feasibility } = useFusionStore();

  const statusConfig = {
    green: {
      bg: 'bg-green-500',
      ring: 'ring-green-300',
      pulse: 'pulse-green',
      label: 'Target Achieved',
      icon: '✓',
    },
    yellow: {
      bg: 'bg-yellow-500',
      ring: 'ring-yellow-300',
      pulse: 'pulse-yellow',
      label: 'Close to Target',
      icon: '~',
    },
    red: {
      bg: 'bg-red-500',
      ring: 'ring-red-300',
      pulse: 'pulse-red',
      label: 'Above Target',
      icon: '!',
    },
  };

  const config = statusConfig[feasibility.status];

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
      <div
        className={`w-12 h-12 rounded-full ${config.bg} ${config.pulse} flex items-center justify-center text-white text-xl font-bold`}
      >
        {config.icon}
      </div>
      <div>
        <div className="font-semibold text-gray-800 dark:text-gray-100">{config.label}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{feasibility.message}</div>
      </div>
    </div>
  );
}
