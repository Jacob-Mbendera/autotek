import mongoose from 'mongoose';
import ServiceProvider from '../models/ServiceProvider';

export async function updateServiceProviderRatingAggregate(
  providerId: mongoose.Types.ObjectId,
  newRating: number
): Promise<void> {
  const p = await ServiceProvider.findById(providerId);
  if (!p) return;
  const n = p.ratingCount + 1;
  const avg = (p.averageRating * p.ratingCount + newRating) / n;
  p.ratingCount = n;
  p.averageRating = Math.round(avg * 100) / 100;
  await p.save();
}
