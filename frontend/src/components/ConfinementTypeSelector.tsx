import { useFusionStore } from '../store';
import { ConfinementType, CONFINEMENT_CONSTRAINTS } from '../utils/calculations';

export function ConfinementTypeSelector() {
  const { confinementType, setConfinementType } = useFusionStore();

  const confinementTypes: { id: ConfinementType; label: string; description: string }[] = [
    {
      id: 'MCF',
      label: 'MCF',
      description: 'Magnetic Confinement',
    },
    {
      id: 'ICF',
      label: 'ICF',
      description: 'Inertial Confinement',
    },
  ];

  const constraints = CONFINEMENT_CONSTRAINTS[confinementType];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Confinement Approach</h3>

      <div className="flex gap-2 mb-4">
        {confinementTypes.map((ct) => (
          <button
            key={ct.id}
            onClick={() => setConfinementType(ct.id)}
            className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
              confinementType === ct.id
                ? 'border-fusion-500 bg-fusion-50 dark:bg-fusion-900/30 text-fusion-700 dark:text-fusion-300'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-300'
            }`}
          >
            <div className="font-semibold">{ct.label}</div>
            <div className="text-xs opacity-75">{ct.description}</div>
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <p>{constraints.description}</p>
      </div>
    </div>
  );
}
