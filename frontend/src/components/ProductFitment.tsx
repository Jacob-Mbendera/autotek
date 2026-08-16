import { AlertTriangle, Car, ShieldCheck } from 'lucide-react';
import type { Product } from '../store/api/productApi';
import { JournalButton, JournalCard, CardHeading, JournalBody } from './journal';

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
    <JournalCard className="mb-8">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-journal-teal" />
            <CardHeading>Vehicle fitment</CardHeading>
          </div>
          <JournalBody className="!text-[13px] !text-journal-muted mt-2">
            Check the listed application before ordering. Year, engine, and vehicle variant can
            affect fit.
          </JournalBody>
        </div>
        {product.isUniversal ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-journal-teal-tint px-3 py-1 text-[12px] font-sans font-medium text-journal-teal">
            <ShieldCheck className="h-3.5 w-3.5" />
            Universal
          </span>
        ) : fitmentStatus === 'verified' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-journal-teal-tint px-3 py-1 text-[12px] font-sans font-medium text-journal-teal">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified applications
          </span>
        ) : fitmentStatus === 'partial' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-journal-warn-bg px-3 py-1 text-[12px] font-sans font-medium text-journal-warn-text">
            <AlertTriangle className="h-3.5 w-3.5" />
            Confirm details
          </span>
        ) : null}
      </div>

      {product.isUniversal ? (
        <div className="rounded-journal border border-journal-teal-tint-border bg-journal-teal-tint p-4">
          <JournalBody className="!text-journal-teal">
            This product is not vehicle-specific. Confirm the product specification, size, or grade
            is suitable for your intended use.
          </JournalBody>
        </div>
      ) : compatibility.length > 0 ? (
        <div className="space-y-3">
          {fitmentStatus === 'partial' && (
            <div className="rounded-journal border border-journal-warn-bg bg-journal-warn-bg p-4">
              <JournalBody className="!text-journal-warn-text">
                These applications are listed but not fully verified. Please confirm your year,
                engine, and variant with AutoTek before ordering.
              </JournalBody>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibility.map((entry, index) => (
              <div
                key={`${entry.make}-${entry.model}-${index}`}
                className="rounded-journal border border-journal-hairline bg-journal-sand p-4"
              >
                <div className="font-sans font-semibold text-[14px] text-journal-ink">
                  {entry.make} {entry.model}
                </div>
                <div className="mt-1 text-[13px] font-sans text-journal-muted">
                  {formatYearRange(entry.yearFrom, entry.yearTo)}
                  {entry.engine ? ` • ${entry.engine}` : ''}
                </div>
                {entry.notes && <div className="mt-2 text-[13px] font-sans text-journal-body">{entry.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-journal border border-journal-warn-bg bg-journal-warn-bg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-journal-warn-text mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-sans font-semibold text-[14px] text-journal-warn-text">Fitment is not listed</div>
              <JournalBody className="!text-journal-warn-text mt-1">
                Do not assume this part fits from its appearance or category. Send us your vehicle
                details and we will help confirm the correct part.
              </JournalBody>
              <JournalButton variant="secondary" className="mt-3" onClick={onRequestPart}>
                Request the correct part
              </JournalButton>
            </div>
          </div>
        </div>
      )}
    </JournalCard>
  );
};
