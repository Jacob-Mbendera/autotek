import type { ProductCompatibilityEntry, ProductFitmentStatus } from '../types';
import { escapeRegex } from './regex';

export interface VehicleFitmentQuery {
  make: string;
  model: string;
  year?: number;
  engine?: string;
  includeUniversal?: boolean;
}

export type VehicleFitmentMatchStrength = 'strong' | 'weak' | 'universal' | 'none';

export const normalizeVehicleText = (value?: string): string =>
  (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Minimum length before an engine code is used in a substring match. Below this,
 * short/generic tokens (e.g. "i", "v", "2") would coincidentally substring-match
 * many unrelated engine codes ("vti", "gdi", "i-VTEC") and overclaim fitment confidence.
 */
const MIN_ENGINE_MATCH_LENGTH = 2;

export const buildVehicleFitmentMongoFilter = (
  vehicle: VehicleFitmentQuery
): Record<string, unknown> | null => {
  const make = vehicle.make.trim();
  const model = vehicle.model.trim();
  if (!make || !model) return null;

  const makeRegex = new RegExp(`^${escapeRegex(make)}$`, 'i');
  const modelRegex = new RegExp(`^${escapeRegex(model)}$`, 'i');

  const elemMatch: Record<string, unknown> = {
    make: makeRegex,
    model: modelRegex,
  };

  const nestedAnd: Record<string, unknown>[] = [];

  if (vehicle.year !== undefined) {
    const year = Number(vehicle.year);
    if (Number.isInteger(year)) {
      nestedAnd.push({
        $or: [
          { yearFrom: { $exists: false } },
          { yearFrom: null },
          { yearFrom: { $lte: year } },
        ],
      });
      nestedAnd.push({
        $or: [
          { yearTo: { $exists: false } },
          { yearTo: null },
          { yearTo: { $gte: year } },
        ],
      });
    }
  }

  if (vehicle.engine?.trim()) {
    const engineRegex = new RegExp(escapeRegex(vehicle.engine.trim()), 'i');
    nestedAnd.push({
      $or: [
        { engine: { $exists: false } },
        { engine: null },
        { engine: '' },
        { engine: engineRegex },
      ],
    });
  }

  if (nestedAnd.length === 1) {
    Object.assign(elemMatch, nestedAnd[0]);
  } else if (nestedAnd.length > 1) {
    elemMatch.$and = nestedAnd;
  }

  const branches: Record<string, unknown>[] = [
    {
      isUniversal: { $ne: true },
      fitmentStatus: { $in: ['partial', 'verified'] },
      compatibility: { $elemMatch: elemMatch },
    },
  ];

  if (vehicle.includeUniversal !== false) {
    branches.push({ isUniversal: true });
  }

  return { $or: branches };
};

const entryMatchesVehicle = (
  entry: ProductCompatibilityEntry,
  vehicle: VehicleFitmentQuery
): boolean => {
  if (
    normalizeVehicleText(entry.make) !== normalizeVehicleText(vehicle.make) ||
    normalizeVehicleText(entry.model) !== normalizeVehicleText(vehicle.model)
  ) {
    return false;
  }

  if (vehicle.year !== undefined) {
    const year = Number(vehicle.year);
    if (entry.yearFrom != null && year < entry.yearFrom) return false;
    if (entry.yearTo != null && year > entry.yearTo) return false;
  }

  const selectedEngine = normalizeVehicleText(vehicle.engine);
  const entryEngine = normalizeVehicleText(entry.engine);
  if (
    selectedEngine.length >= MIN_ENGINE_MATCH_LENGTH &&
    entryEngine.length >= MIN_ENGINE_MATCH_LENGTH &&
    !entryEngine.includes(selectedEngine) &&
    !selectedEngine.includes(entryEngine)
  ) {
    return false;
  }

  return true;
};

export const getVehicleFitmentMatchStrength = (
  product: {
    isUniversal?: boolean;
    fitmentStatus?: ProductFitmentStatus;
    compatibility?: ProductCompatibilityEntry[];
  },
  vehicle?: Partial<VehicleFitmentQuery> | null
): VehicleFitmentMatchStrength => {
  if (!vehicle?.make?.trim() || !vehicle?.model?.trim()) return 'none';
  if (product.isUniversal) return 'universal';
  // Defense-in-depth: a non-universal product explicitly marked fitmentStatus 'none'
  // should never present as a vehicle match, even if compatibility rows exist on it
  // (write-time validation should prevent that combination, but this guard doesn't
  // rely on that invariant holding everywhere data can be written).
  if (product.fitmentStatus === 'none') return 'none';

  const query: VehicleFitmentQuery = {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    engine: vehicle.engine,
  };

  const matches = (product.compatibility || []).filter((entry) =>
    entryMatchesVehicle(entry, query)
  );
  if (matches.length === 0) return 'none';

  const hasVerified = product.fitmentStatus === 'verified';
  const yearSatisfied =
    vehicle.year === undefined ||
    matches.some(
      (entry) =>
        (entry.yearFrom == null || entry.yearFrom <= vehicle.year!) &&
        (entry.yearTo == null || entry.yearTo >= vehicle.year!)
    );
  const selectedEngine = normalizeVehicleText(vehicle.engine);
  const engineSatisfied =
    !selectedEngine ||
    matches.some((entry) => {
      const entryEngine = normalizeVehicleText(entry.engine);
      if (!entryEngine) return true;
      if (selectedEngine.length < MIN_ENGINE_MATCH_LENGTH || entryEngine.length < MIN_ENGINE_MATCH_LENGTH) {
        return selectedEngine === entryEngine;
      }
      return entryEngine.includes(selectedEngine) || selectedEngine.includes(entryEngine);
    });

  if (hasVerified && yearSatisfied && engineSatisfied) return 'strong';
  return 'weak';
};

export type CatalogSuggestionConfidence = 'exact' | 'strong' | 'possible';

export interface CatalogSuggestionInput {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  partNumber?: string;
  productName?: string;
  category?: string;
}

export interface CatalogSuggestionCandidate {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'available' | 'out-of-stock';
  brand?: string;
  oemPartNumber?: string;
  alternatePartNumbers?: string[];
  isUniversal?: boolean;
  fitmentStatus?: ProductFitmentStatus;
  compatibility?: ProductCompatibilityEntry[];
  images?: unknown[];
}

export interface CatalogSuggestion {
  product: CatalogSuggestionCandidate;
  confidence: CatalogSuggestionConfidence;
  reasons: string[];
  score: number;
}

const normalizePartNumber = (value?: string): string =>
  (value || '').trim().replace(/[\s-]/g, '').toLowerCase();

const tokenize = (value?: string): string[] =>
  normalizeVehicleText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);

export const scoreCatalogProductSuggestion = (
  product: CatalogSuggestionCandidate,
  input: CatalogSuggestionInput
): CatalogSuggestion | null => {
  const reasons: string[] = [];
  let score = 0;
  let confidence: CatalogSuggestionConfidence = 'possible';

  const requestedPartNumber = normalizePartNumber(input.partNumber);
  const oem = normalizePartNumber(product.oemPartNumber);
  const alternates = (product.alternatePartNumbers || []).map(normalizePartNumber);
  const exactPartNumber =
    Boolean(requestedPartNumber) &&
    (oem === requestedPartNumber || alternates.includes(requestedPartNumber));

  if (exactPartNumber) {
    score += 100;
    confidence = 'exact';
    reasons.push('Exact part number match');
  }

  const vehicle: VehicleFitmentQuery | null =
    input.make?.trim() && input.model?.trim()
      ? {
          make: input.make,
          model: input.model,
          year: input.year,
          engine: input.engine,
          includeUniversal: true,
        }
      : null;

  if (vehicle) {
    const strength = getVehicleFitmentMatchStrength(product, vehicle);
    if (strength === 'none' && !exactPartNumber && !product.isUniversal) {
      return null;
    }
    if (strength === 'strong') {
      score += 40;
      if (confidence !== 'exact') confidence = 'strong';
      reasons.push('Verified fit for your vehicle');
    } else if (strength === 'weak') {
      score += 20;
      reasons.push('Possible fit — confirm year/engine');
    } else if (strength === 'universal') {
      score += 15;
      reasons.push('Universal / not vehicle-specific');
    }
  }

  if (input.category?.trim()) {
    if (normalizeVehicleText(product.category) === normalizeVehicleText(input.category)) {
      score += 10;
      reasons.push('Same category');
    }
  }

  const nameTokens = tokenize(input.productName);
  if (nameTokens.length > 0) {
    const productName = normalizeVehicleText(product.name);
    const hitCount = nameTokens.filter((token) => productName.includes(token)).length;
    if (hitCount > 0) {
      score += Math.min(25, hitCount * 8);
      reasons.push('Name similar to requested part');
    } else if (
      !exactPartNumber &&
      (!vehicle || getVehicleFitmentMatchStrength(product, vehicle) === 'none')
    ) {
      return null;
    }
  }

  if (product.stock <= 0 || product.status === 'out-of-stock') {
    score -= 15;
    reasons.push('Currently out of stock');
  }

  if (score <= 0 || reasons.length === 0) return null;

  if (
    !exactPartNumber &&
    vehicle &&
    getVehicleFitmentMatchStrength(product, vehicle) === 'none' &&
    !product.isUniversal
  ) {
    return null;
  }

  if (!exactPartNumber && confidence === 'possible' && score < 20) {
    return null;
  }

  return {
    product,
    confidence,
    reasons: [...new Set(reasons)],
    score,
  };
};

export const rankCatalogProductSuggestions = (
  products: CatalogSuggestionCandidate[],
  input: CatalogSuggestionInput,
  limit = 5
): CatalogSuggestion[] =>
  products
    .map((product) => scoreCatalogProductSuggestion(product, input))
    .filter((item): item is CatalogSuggestion => Boolean(item))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);

