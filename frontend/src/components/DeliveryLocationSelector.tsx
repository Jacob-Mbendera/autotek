import { useGetDeliveryLocationsQuery } from '../store/api/deliveryLocationApi';
import type { ShippingAddress } from '../store/api/orderApi';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export type ServiceLocationVariant =
  | 'delivery'
  | 'service_pickup'
  | 'service_destination'
  | 'service_car';

const VARIANT_COPY: Record<
  ServiceLocationVariant,
  { landmarkHint: string; previewPrefix: string }
> = {
  delivery: {
    landmarkHint: 'Choose the landmark closest to your delivery location',
    previewPrefix: 'Delivery to:',
  },
  service_pickup: {
    landmarkHint: 'Choose the landmark closest to where the vehicle is now (pickup)',
    previewPrefix: 'Pickup:',
  },
  service_destination: {
    landmarkHint: 'Choose the landmark closest to the drop-off location',
    previewPrefix: 'Drop-off:',
  },
  service_car: {
    landmarkHint: 'Choose the landmark closest to where the mechanic should meet you',
    previewPrefix: 'Service at:',
  },
};

interface DeliveryLocationSelectorProps {
  value: ShippingAddress | null;
  onChange: (value: ShippingAddress) => void;
  error?: string;
  required?: boolean;
  /** Defaults to checkout-style delivery copy */
  variant?: ServiceLocationVariant;
}

export const DeliveryLocationSelector = ({
  value,
  onChange,
  error,
  required = false,
  variant = 'delivery',
}: DeliveryLocationSelectorProps) => {
  const { data, isLoading, isError } = useGetDeliveryLocationsQuery();
  const copy = VARIANT_COPY[variant];

  // Use value prop directly (controlled component)
  const selectedTown = value?.town || '';
  const selectedLandmark = value?.landmark || '';
  const customAddress = value?.customAddress || '';
  const showCustomInput = selectedLandmark === 'Other/Custom';

  // Get landmarks for selected town
  const selectedTownData = data?.deliveryLocations.find((loc) => loc.town === selectedTown);
  const landmarks = selectedTownData?.landmarks || [];

  // Handle town selection
  const handleTownChange = (town: string) => {
    onChange({
      town,
      landmark: '',
      customAddress: '',
    });
  };

  // Handle landmark selection
  const handleLandmarkChange = (landmark: string) => {
    const townToUse = selectedTown || value?.town || '';

    // If "Other/Custom" is selected, set empty customAddress to show textarea
    if (landmark === 'Other/Custom') {
      onChange({
        town: townToUse,
        landmark,
        customAddress: '',
      });
    } else {
      // Emit the structured address (no customAddress)
      onChange({
        town: townToUse,
        landmark,
      });
    }
  };

  // Handle custom address input
  const handleCustomAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const custom = e.target.value;
    const townToUse = selectedTown || value?.town || '';

    // Always notify parent of changes
    onChange({
      town: townToUse,
      landmark: selectedLandmark,
      customAddress: custom,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-journal-teal" />
        <span className="ml-2 text-[13px] font-sans text-journal-muted">Loading delivery locations...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-journal-danger-bg border border-journal-error-border rounded-journal text-journal-danger-text">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-[13px] font-sans">Failed to load delivery locations. Please try again.</span>
      </div>
    );
  }

  const towns = data.deliveryLocations.map((loc) => loc.town);
  const selectClassName =
    'w-full px-3.5 py-3 border rounded-journal text-[14px] font-sans text-journal-ink bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors';

  return (
    <div className="space-y-4">
      {/* Town Selection */}
      <div>
        <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
          <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Town / City {required && <span className="text-journal-danger-text">*</span>}
        </label>
        <select
          value={selectedTown}
          onChange={(e) => handleTownChange(e.target.value)}
          required={required}
          className={cn(selectClassName, error && !selectedTown ? 'border-journal-error-border-strong' : 'border-journal-input-border')}
        >
          <option value="">Select your town or city</option>
          {towns.map((town) => (
            <option key={town} value={town}>
              {town}
            </option>
          ))}
        </select>
      </div>

      {/* Landmark Selection */}
      {selectedTown && (
        <div>
          <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
            Landmark / Area {required && <span className="text-journal-danger-text">*</span>}
          </label>
          <select
            value={selectedLandmark}
            onChange={(e) => handleLandmarkChange(e.target.value)}
            required={required}
            className={cn(selectClassName, error && !selectedLandmark ? 'border-journal-error-border-strong' : 'border-journal-input-border')}
          >
            <option value="">Select a landmark or area</option>
            {landmarks.map((landmark) => (
              <option key={landmark._id} value={landmark.name}>
                {landmark.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] font-sans text-journal-faint">{copy.landmarkHint}</p>
        </div>
      )}

      {/* Custom Address Input (shown when "Other/Custom" is selected) */}
      {showCustomInput && (
        <div>
          <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
            Describe your location {required && <span className="text-journal-danger-text">*</span>}
          </label>
          <textarea
            value={customAddress}
            onChange={handleCustomAddressChange}
            required={required}
            placeholder="Please provide detailed directions to your location (e.g., near the blue gate, opposite the church, behind the market)"
            rows={3}
            className={cn(
              'w-full px-3.5 py-3 border rounded-journal text-[14px] font-sans text-journal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors resize-none',
              error && !customAddress.trim() ? 'border-journal-error-border-strong' : 'border-journal-input-border'
            )}
          />
          <p className="mt-1.5 text-[12px] font-sans text-journal-faint">
            Help us find you: Describe nearby landmarks, buildings, or notable features
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-[13px] font-sans text-journal-danger-text flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {/* Selected Address Preview */}
      {selectedTown && selectedLandmark && !showCustomInput && (
        <div className="p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
          <p className="text-[13px] font-sans text-journal-teal">
            <strong>{copy.previewPrefix}</strong> {selectedTown}, {selectedLandmark}
          </p>
        </div>
      )}

      {selectedTown && selectedLandmark && showCustomInput && customAddress.trim() && (
        <div className="p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
          <p className="text-[13px] font-sans text-journal-teal">
            <strong>{copy.previewPrefix}</strong> {selectedTown} - {customAddress}
          </p>
        </div>
      )}
    </div>
  );
};
