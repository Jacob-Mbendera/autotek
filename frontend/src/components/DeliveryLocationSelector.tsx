import { useState } from 'react';
import { useGetDeliveryLocationsQuery } from '../store/api/deliveryLocationApi';
import type { ShippingAddress } from '../store/api/orderApi';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

interface DeliveryLocationSelectorProps {
  value: ShippingAddress | null;
  onChange: (value: ShippingAddress) => void;
  error?: string;
  required?: boolean;
}

export const DeliveryLocationSelector = ({
  value,
  onChange,
  error,
  required = false,
}: DeliveryLocationSelectorProps) => {
  const { data, isLoading, isError } = useGetDeliveryLocationsQuery();

  const [selectedTown, setSelectedTown] = useState<string>(value?.town || '');
  const [selectedLandmark, setSelectedLandmark] = useState<string>(value?.landmark || '');
  const [customAddress, setCustomAddress] = useState<string>(value?.customAddress || '');
  const [showCustomInput, setShowCustomInput] = useState(value?.landmark === 'Other/Custom');

  // Get landmarks for selected town
  const selectedTownData = data?.deliveryLocations.find((loc) => loc.town === selectedTown);
  const landmarks = selectedTownData?.landmarks || [];

  // Handle town selection
  const handleTownChange = (town: string) => {
    setSelectedTown(town);
    setSelectedLandmark('');
    setShowCustomInput(false);
    setCustomAddress('');
  };

  // Handle landmark selection
  const handleLandmarkChange = (landmark: string) => {
    setSelectedLandmark(landmark);

    // If "Other/Custom" is selected, show custom address input
    if (landmark === 'Other/Custom') {
      setShowCustomInput(true);
      setCustomAddress('');
      // Notify parent immediately that "Other/Custom" was selected
      onChange({
        town: selectedTown,
        landmark,
        customAddress: '',
      });
    } else {
      setShowCustomInput(false);
      setCustomAddress('');
      // Emit the structured address
      onChange({
        town: selectedTown,
        landmark,
      });
    }
  };

  // Handle custom address input
  const handleCustomAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const custom = e.target.value;
    setCustomAddress(custom);

    // Always notify parent of changes, even if empty
    onChange({
      town: selectedTown,
      landmark: selectedLandmark,
      customAddress: custom,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading delivery locations...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load delivery locations. Please try again.</span>
      </div>
    );
  }

  const towns = data.deliveryLocations.map((loc) => loc.town);

  return (
    <div className="space-y-4">
      {/* Town Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Town / City {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedTown}
          onChange={(e) => handleTownChange(e.target.value)}
          required={required}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
            error && !selectedTown ? 'border-red-500' : 'border-gray-300'
          }`}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Landmark / Area {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedLandmark}
            onChange={(e) => handleLandmarkChange(e.target.value)}
            required={required}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
              error && !selectedLandmark ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a landmark or area</option>
            {landmarks.map((landmark) => (
              <option key={landmark._id} value={landmark.name}>
                {landmark.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose the landmark closest to your delivery location
          </p>
        </div>
      )}

      {/* Custom Address Input (shown when "Other/Custom" is selected) */}
      {showCustomInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe Your Location {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={customAddress}
            onChange={handleCustomAddressChange}
            required={required}
            placeholder="Please provide detailed directions to your location (e.g., near the blue gate, opposite the church, behind the market)"
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none ${
              error && !customAddress.trim() ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Help us find you: Describe nearby landmarks, buildings, or notable features
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Selected Address Preview */}
      {selectedTown && selectedLandmark && !showCustomInput && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm text-teal-800">
            <strong>Delivery to:</strong> {selectedTown}, {selectedLandmark}
          </p>
        </div>
      )}

      {selectedTown && selectedLandmark && showCustomInput && customAddress.trim() && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm text-teal-800">
            <strong>Delivery to:</strong> {selectedTown} - {customAddress}
          </p>
        </div>
      )}
    </div>
  );
};
