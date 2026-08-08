import { Car } from 'lucide-react';
import { VEHICLE_MAKES, getModelsForMake } from '../constants/vehicleOptions';
import type { SelectedVehicle } from '../utils/vehicleFitmentFilter';
import { Input } from './ui/Input';
import { Body } from './ui/Typography';

interface VehicleFitmentFilterProps {
  value: SelectedVehicle;
  onChange: (value: SelectedVehicle) => void;
  onClear: () => void;
}

const selectClassName =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all';

export const VehicleFitmentFilter = ({
  value,
  onChange,
  onClear,
}: VehicleFitmentFilterProps) => {
  const models = getModelsForMake(value.make);
  const hasVehicle = Boolean(value.make && value.model);

  return (
    <div className="mb-6 pb-6 border-b-2 border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">My vehicle</h3>
        </div>
        {hasVehicle && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline"
          >
            Clear vehicle
          </button>
        )}
      </div>

      <Body className="text-xs text-gray-600 mb-3">
        Show only parts listed for your car. Products without fitment data are hidden.
      </Body>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Make</label>
          <select
            value={value.make}
            onChange={(e) =>
              onChange({
                ...value,
                make: e.target.value,
                model: '',
              })
            }
            className={selectClassName}
          >
            <option value="">Select make</option>
            {VEHICLE_MAKES.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
          <select
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            disabled={!value.make}
            className={`${selectClassName} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">{value.make ? 'Select model' : 'Select make first'}</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Year (optional)"
            type="number"
            min="1900"
            max="2100"
            value={value.year}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
            placeholder="e.g. 2012"
          />
          <Input
            label="Engine (optional)"
            value={value.engine}
            onChange={(e) => onChange({ ...value, engine: e.target.value })}
            placeholder="e.g. 1.3"
          />
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includeUniversal}
            onChange={(e) => onChange({ ...value, includeUniversal: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-xs text-gray-700">
            Include universal parts (not vehicle-specific)
          </span>
        </label>

        {hasVehicle && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
            <Body className="text-xs text-teal-800">
              Filtering for {value.year ? `${value.year} ` : ''}
              {value.make} {value.model}
              {value.engine ? ` · ${value.engine}` : ''}
            </Body>
          </div>
        )}

        {!hasVehicle && value.make && (
          <Body className="text-xs text-amber-700">Select a model to apply vehicle filtering.</Body>
        )}
      </div>
    </div>
  );
};
