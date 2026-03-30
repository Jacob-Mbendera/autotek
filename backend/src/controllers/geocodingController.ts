import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { reverseGeocodeLatLng } from '../utils/geocoding';

/**
 * Authenticated reverse geocode for "use my location" on service booking.
 */
export const reverseGeocodeHandler = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ message: 'Valid latitude and longitude are required' });
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ message: 'Coordinates are out of range' });
      return;
    }

    const result = await reverseGeocodeLatLng(lat, lng);
    if (!result) {
      res.status(404).json({
        message: 'Could not resolve that position to an address. Try town and landmark below.',
      });
      return;
    }

    res.json({
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: result.formattedAddress,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error?.message || 'Reverse geocoding failed',
    });
  }
};
