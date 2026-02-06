import { useFusionStore } from '../store';
import { ConfinementType, CONFINEMENT_INFO } from '../utils/calculations';

export function ConfinementTypeSelector() {
  const { confinementType, setConfinementType } = useFusionStore();

  const confinementTypes: { id: ConfinementType; label: string; shortLabel: string }[] = [
    { id: 'Tokamak', label: 'Tokamak', shortLabel: 'Tok' },
    { id: 'Spherical Tokamak', label: 'Spherical Tokamak', shortLabel: 'ST' },
    { id: 'Stellarator', label: 'Stellarator', shortLabel: 'Stel' },
    { id: 'Z-Pinch', label: 'Z-Pinch', shortLabel: 'Z-P' },
    { id: 'Magnetized Target', label: 'Magnetized Target', shortLabel: 'MTF' },
    { id: 'Inertial', label: 'Inertial (Laser)', shortLabel: 'ICF' },
  ];

  const info = CONFINEMENT_INFO[confinementType];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Confinement Approach</h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {confinementTypes.map((ct) => (
          <button
            key={ct.id}
            onClick={() => setConfinementType(ct.id)}
            className={`px-2 py-2 rounded-lg border-2 transition-all ${
              confinementType === ct.id
                ? 'border-fusion-500 bg-fusion-50 dark:bg-fusion-900/30 text-fusion-700 dark:text-fusion-300'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-300'
            }`}
          >
            <div className="font-semibold text-sm">{ct.shortLabel}</div>
            <div className="text-xs opacity-75 truncate">{ct.label}</div>
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <p>{info.description}</p>
      </div>
    </div>
  );
}
