export interface SelectedVehicle {
  make: string;
  model: string;
  year: string;
  engine: string;
  includeUniversal: boolean;
}

export const emptySelectedVehicle = (): SelectedVehicle => ({
  make: '',
  model: '',
  year: '',
  engine: '',
  includeUniversal: true,
});

export const buildRequestPartPath = (vehicle: SelectedVehicle): string => {
  const params = new URLSearchParams();
  if (vehicle.make) params.set('make', vehicle.make);
  if (vehicle.model) params.set('model', vehicle.model);
  if (vehicle.year) params.set('year', vehicle.year);
  if (vehicle.engine) params.set('engine', vehicle.engine);
  const query = params.toString();
  return query ? `/request-part?${query}` : '/request-part';
};
