import { useFusionStore } from '../store';
import { FuelType, FUEL_INFO } from '../utils/calculations';

export function FuelTypeSelector() {
  const { fuelType, setFuelType } = useFusionStore();

  const fuelTypes: { id: FuelType; label: string; description: string }[] = [
    {
      id: 'D-T',
      label: 'D-T',
      description: 'Deuterium-Tritium',
    },
    {
      id: 'D-He3',
      label: 'D-He3',
      description: 'Deuterium-Helium-3',
    },
    {
      id: 'p-B11',
      label: 'p-B11',
      description: 'Proton-Boron-11',
    },
  ];

  const fuelInfo = FUEL_INFO[fuelType];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Fuel Type</h3>

      <div className="flex gap-2 mb-4">
        {fuelTypes.map((fuel) => (
          <button
            key={fuel.id}
            onClick={() => setFuelType(fuel.id)}
            className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
              fuelType === fuel.id
                ? 'border-fusion-500 bg-fusion-50 dark:bg-fusion-900/30 text-fusion-700 dark:text-fusion-300'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-300'
            }`}
          >
            <div className="font-semibold">{fuel.label}</div>
            <div className="text-xs opacity-75">{fuel.description}</div>
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <p className="mb-2">{fuelInfo.description}</p>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div>
            <span className="font-medium">CF Modifier:</span>{' '}
            <span className={fuelInfo.cfModifier < 1 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              {fuelInfo.cfModifier < 1 ? '' : '+'}
              {((fuelInfo.cfModifier - 1) * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="font-medium">Regulatory:</span>{' '}
            <span className={fuelInfo.regulatoryModifier > 1 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              +{((fuelInfo.regulatoryModifier - 1) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
