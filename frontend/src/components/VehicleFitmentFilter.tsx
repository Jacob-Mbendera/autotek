import { Car } from 'lucide-react';
import { VEHICLE_MAKES, getModelsForMake } from '../constants/vehicleOptions';
import type { SelectedVehicle } from '../utils/vehicleFitmentFilter';
import { JournalInput, JournalBody } from './journal';

interface VehicleFitmentFilterProps {
  value: SelectedVehicle;
  onChange: (value: SelectedVehicle) => void;
  onClear: () => void;
}

const selectClassName =
  'w-full px-3.5 py-2.5 border border-journal-input-border rounded-journal text-[13px] font-sans text-journal-ink bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors';

export const VehicleFitmentFilter = ({
  value,
  onChange,
  onClear,
}: VehicleFitmentFilterProps) => {
  const models = getModelsForMake(value.make);
  const hasVehicle = Boolean(value.make && value.model);

  return (
    <div className="mb-6 pb-6 border-b border-journal-hairline">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-journal-teal" />
          <h3 className="text-[12px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">My vehicle</h3>
        </div>
        {hasVehicle && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] text-journal-teal hover:underline font-sans font-medium"
          >
            Clear vehicle
          </button>
        )}
      </div>

      <JournalBody className="!text-[12px] !text-journal-muted mb-3">
        Show only parts listed for your car. Products without fitment data are hidden.
      </JournalBody>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">Make</label>
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
          <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">Model</label>
          <select
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            disabled={!value.make}
            className={`${selectClassName} disabled:bg-journal-sand disabled:text-journal-faint`}
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
          <JournalInput
            label="Year (optional)"
            type="number"
            min="1900"
            max="2100"
            value={value.year}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
            placeholder="e.g. 2012"
          />
          <JournalInput
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
            className="mt-0.5 h-4 w-4 rounded border-journal-input-border text-journal-teal focus:ring-journal-teal"
          />
          <span className="text-[12px] font-sans text-journal-body">
            Include universal parts (not vehicle-specific)
          </span>
        </label>

        {hasVehicle && (
          <div className="rounded-journal border border-journal-teal-tint-border bg-journal-teal-tint px-3 py-2">
            <JournalBody className="!text-[12px] !text-journal-teal">
              Filtering for {value.year ? `${value.year} ` : ''}
              {value.make} {value.model}
              {value.engine ? ` · ${value.engine}` : ''}
            </JournalBody>
          </div>
        )}

        {!hasVehicle && value.make && (
          <JournalBody className="!text-[12px] !text-journal-warn-text">Select a model to apply vehicle filtering.</JournalBody>
        )}
      </div>
    </div>
  );
};
