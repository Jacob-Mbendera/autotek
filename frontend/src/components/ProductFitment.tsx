import { AlertTriangle, Car, ShieldCheck } from 'lucide-react';
import type { Product } from '../store/api/productApi';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Body, H1 } from './ui/Typography';

interface ProductFitmentProps {
  product: Pick<Product, 'isUniversal' | 'compatibility' | 'fitmentStatus'>;
  onRequestPart: () => void;
}

const formatYearRange = (yearFrom?: number, yearTo?: number) => {
  if (yearFrom && yearTo) return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
  if (yearFrom) return `${yearFrom} onward`;
  if (yearTo) return `Up to ${yearTo}`;
  return 'All listed years';
};

export const ProductFitment = ({ product, onRequestPart }: ProductFitmentProps) => {
  const compatibility = product.compatibility ?? [];
  const fitmentStatus = product.fitmentStatus ?? 'none';

  return (
    <Card variant="md" className="mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-teal-600" />
            <H1 className="text-2xl font-bold text-gray-900">Vehicle Fitment</H1>
          </div>
          <Body className="text-sm text-gray-600 mt-2">
            Check the listed application before ordering. Year, engine, and vehicle variant can
            affect fit.
          </Body>
        </div>
        {product.isUniversal ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <ShieldCheck className="h-4 w-4" />
            Universal
          </span>
        ) : fitmentStatus === 'verified' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <ShieldCheck className="h-4 w-4" />
            Verified applications
          </span>
        ) : fitmentStatus === 'partial' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Confirm details
          </span>
        ) : null}
      </div>

      {product.isUniversal ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <Body className="text-green-800">
            This product is not vehicle-specific. Confirm the product specification, size, or grade
            is suitable for your intended use.
          </Body>
        </div>
      ) : compatibility.length > 0 ? (
        <div className="space-y-3">
          {fitmentStatus === 'partial' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <Body className="text-amber-800">
                These applications are listed but not fully verified. Please confirm your year,
                engine, and variant with AutoTek before ordering.
              </Body>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibility.map((entry, index) => (
              <div
                key={`${entry.make}-${entry.model}-${index}`}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="font-semibold text-gray-900">
                  {entry.make} {entry.model}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {formatYearRange(entry.yearFrom, entry.yearTo)}
                  {entry.engine ? ` • ${entry.engine}` : ''}
                </div>
                {entry.notes && <div className="mt-2 text-sm text-gray-700">{entry.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-amber-900">Fitment is not listed</div>
              <Body className="text-amber-800 mt-1">
                Do not assume this part fits from its appearance or category. Send us your vehicle
                details and we will help confirm the correct part.
              </Body>
              <Button variant="secondary" size="small" className="mt-3" onClick={onRequestPart}>
                Request the correct part
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
