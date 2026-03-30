/** Mongoose populate config for assigned ServiceProvider + Garage on towing/car services */
export const populateAssignedDriver = {
  path: 'assignedDriver' as const,
  select: 'name phone whatsAppPhone providerType garage averageRating ratingCount',
  populate: { path: 'garage', select: 'name town verificationStatus' },
};

export const populateAssignedMechanic = {
  path: 'assignedMechanic' as const,
  select: 'name phone whatsAppPhone providerType garage averageRating ratingCount',
  populate: { path: 'garage', select: 'name town verificationStatus' },
};
