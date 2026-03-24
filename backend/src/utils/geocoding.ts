/**
 * Geocoding Utility for AutoTek
 * Converts addresses to coordinates (latitude/longitude)
 *
 * Supports:
 * 1. Google Maps Geocoding API (if GOOGLE_MAPS_API_KEY set)
 * 2. OpenStreetMap Nominatim (free fallback)
 */

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode address using Google Maps API (if configured) or OpenStreetMap
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    console.warn('Geocoding: Empty address provided');
    return null;
  }

  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;

  // Try Google Maps first if API key is configured
  if (googleMapsKey) {
    try {
      return await geocodeWithGoogleMaps(address, googleMapsKey);
    } catch (error) {
      console.error('Google Maps geocoding failed, falling back to OpenStreetMap:', error);
      // Fall through to OpenStreetMap
    }
  }

  // Fallback to OpenStreetMap Nominatim (free)
  try {
    return await geocodeWithOpenStreetMap(address);
  } catch (error) {
    console.error('Geocoding failed for address:', address, error);
    return null;
  }
}

/**
 * Geocode using Google Maps Geocoding API
 */
async function geocodeWithGoogleMaps(
  address: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json() as any;

  if (data.status === 'OK' && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: data.results[0].formatted_address,
    };
  }

  if (data.status === 'ZERO_RESULTS') {
    console.warn(`Google Maps: No results for address: ${address}`);
    return null;
  }

  throw new Error(`Google Maps API error: ${data.status}`);
}

/**
 * Geocode using OpenStreetMap Nominatim (free)
 */
async function geocodeWithOpenStreetMap(address: string): Promise<GeocodingResult | null> {
  // Nominatim requires a User-Agent header
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AutoTek/1.0 (https://autotek.mw)',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap API error: ${response.status}`);
  }

  const data = await response.json() as any;

  if (data.length > 0) {
    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name,
    };
  }

  console.warn(`OpenStreetMap: No results for address: ${address}`);
  return null;
}

/**
 * Geocode address with fallback to default Malawi coordinates if geocoding fails
 * Useful for service bookings where we don't want to fail if geocoding doesn't work
 */
export async function geocodeAddressWithFallback(
  address: string,
  fallbackCoords: { latitude: number; longitude: number } = {
    latitude: -13.9626, // Lilongwe, Malawi
    longitude: 33.7741,
  }
): Promise<GeocodingResult> {
  const result = await geocodeAddress(address);

  if (result) {
    return result;
  }

  // Return fallback coordinates with original address
  console.warn(`Using fallback coordinates for address: ${address}`);
  return {
    latitude: fallbackCoords.latitude,
    longitude: fallbackCoords.longitude,
    formattedAddress: address,
  };
}
