import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import DeliveryLocation from '../models/DeliveryLocation';
import mongoose from 'mongoose';

// Get all active delivery locations (Public)
export const getDeliveryLocations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const deliveryLocations = await DeliveryLocation.find({ active: true })
      .select('town landmarks deliveryFee active')
      .lean();

    // Filter to only include active landmarks
    const filtered = deliveryLocations.map((location: any) => ({
      ...location,
      landmarks: location.landmarks.filter((landmark: any) => landmark.active),
    }));

    res.json({ deliveryLocations: filtered });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch delivery locations' });
  }
};

// Create a new town with landmarks (Admin only)
export const createTown = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { town, landmarks, deliveryFee } = req.body;

    if (!town || !town.trim()) {
      res.status(400).json({ message: 'Town name is required' });
      return;
    }

    if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
      res.status(400).json({ message: 'At least one landmark is required' });
      return;
    }

    if (deliveryFee !== undefined && (typeof deliveryFee !== 'number' || deliveryFee < 0)) {
      res.status(400).json({ message: 'Delivery fee must be a non-negative number' });
      return;
    }

    // Check if town already exists
    const existingTown = await DeliveryLocation.findOne({
      town: { $regex: new RegExp(`^${town.trim()}$`, 'i') }
    });

    if (existingTown) {
      res.status(400).json({ message: 'Town already exists' });
      return;
    }

    // Create landmarks array with proper structure
    const landmarksArray = landmarks.map((name: string) => ({
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      active: true,
    }));

    const deliveryLocation = new DeliveryLocation({
      town: town.trim(),
      landmarks: landmarksArray,
      deliveryFee: deliveryFee ?? 0,
      active: true,
    });

    await deliveryLocation.save();

    res.status(201).json({
      message: 'Town created successfully',
      deliveryLocation
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create town' });
  }
};

// Update town name (Admin only)
export const updateTown = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { town, active, deliveryFee } = req.body;

    const deliveryLocation = await DeliveryLocation.findById(id);

    if (!deliveryLocation) {
      res.status(404).json({ message: 'Town not found' });
      return;
    }

    if (town !== undefined) {
      if (!town.trim()) {
        res.status(400).json({ message: 'Town name cannot be empty' });
        return;
      }

      // Check if new town name already exists (excluding current town)
      const existingTown = await DeliveryLocation.findOne({
        _id: { $ne: id as string },
        town: { $regex: new RegExp(`^${town.trim()}$`, 'i') }
      });

      if (existingTown) {
        res.status(400).json({ message: 'Town name already exists' });
        return;
      }

      deliveryLocation.town = town.trim();
    }

    if (deliveryFee !== undefined) {
      if (typeof deliveryFee !== 'number' || deliveryFee < 0) {
        res.status(400).json({ message: 'Delivery fee must be a non-negative number' });
        return;
      }
      deliveryLocation.deliveryFee = deliveryFee;
    }

    if (active !== undefined) {
      deliveryLocation.active = active;
    }

    await deliveryLocation.save();

    res.json({
      message: 'Town updated successfully',
      deliveryLocation
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update town' });
  }
};

// Delete town (soft delete - set active to false) (Admin only)
export const deleteTown = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const deliveryLocation = await DeliveryLocation.findById(id);

    if (!deliveryLocation) {
      res.status(404).json({ message: 'Town not found' });
      return;
    }

    deliveryLocation.active = false;
    await deliveryLocation.save();

    res.json({
      message: 'Town deleted successfully',
      deliveryLocation
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete town' });
  }
};

// Add landmark to town (Admin only)
export const createLandmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Landmark name is required' });
      return;
    }

    const deliveryLocation = await DeliveryLocation.findById(id);

    if (!deliveryLocation) {
      res.status(404).json({ message: 'Town not found' });
      return;
    }

    // Check if landmark already exists in this town
    const existingLandmark = deliveryLocation.landmarks.find(
      (landmark: any) => landmark.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingLandmark) {
      res.status(400).json({ message: 'Landmark already exists in this town' });
      return;
    }

    const newLandmark = {
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      active: true,
    };

    deliveryLocation.landmarks.push(newLandmark as any);
    await deliveryLocation.save();

    res.status(201).json({
      message: 'Landmark added successfully',
      deliveryLocation
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to add landmark' });
  }
};

// Update landmark (Admin only)
export const updateLandmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, landmarkId } = req.params;
    const { name, active } = req.body;

    const deliveryLocation = await DeliveryLocation.findById(id);

    if (!deliveryLocation) {
      res.status(404).json({ message: 'Town not found' });
      return;
    }

    const landmark = deliveryLocation.landmarks.find(
      (l: any) => l._id.toString() === landmarkId
    );

    if (!landmark) {
      res.status(404).json({ message: 'Landmark not found' });
      return;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ message: 'Landmark name cannot be empty' });
        return;
      }

      // Check if new landmark name already exists in this town (excluding current landmark)
      const existingLandmark = deliveryLocation.landmarks.find(
        (l: any) => l._id.toString() !== landmarkId &&
                    l.name.toLowerCase() === name.trim().toLowerCase()
      );

      if (existingLandmark) {
        res.status(400).json({ message: 'Landmark name already exists in this town' });
        return;
      }

      landmark.name = name.trim();
    }

    if (active !== undefined) {
      landmark.active = active;
    }

    await deliveryLocation.save();

    res.json({
      message: 'Landmark updated successfully',
      deliveryLocation
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update landmark' });
  }
};

// Delete landmark (soft delete - set active to false) (Admin only)
export const deleteLandmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, landmarkId } = req.params;

    const deliveryLocation = await DeliveryLocation.findById(id);

    if (!deliveryLocation) {
      res.status(404).json({ message: 'Town not found' });
      return;
    }

    const landmark = deliveryLocation.landmarks.find(
      (l: any) => l._id.toString() === landmarkId
    );

    if (!landmark) {
      res.status(404).json({ message: 'Landmark not found' });
      return;
    }

    landmark.active = false;
    await deliveryLocation.save();

    res.json({
      message: 'Landmark deleted successfully',
      deliveryLocation
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete landmark' });
  }
};
