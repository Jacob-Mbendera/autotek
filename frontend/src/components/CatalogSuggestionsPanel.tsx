import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Package, ShieldCheck } from 'lucide-react';
import type { ProductSuggestion } from '../store/api/productApi';
import { getProductImageUrl } from '../utils/productImage';
import { Body } from './ui/Typography';
import { Button } from './ui/Button';

interface CatalogSuggestionsPanelProps {
  suggestions: ProductSuggestion[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  dark?: boolean;
  onDismiss?: () => void;
  dismissed?: boolean;
}

const confidenceLabel = (confidence: ProductSuggestion['confidence']) => {
  switch (confidence) {
    case 'exact':
      return 'Exact part number';
    case 'strong':
      return 'Likely fit';
    default:
      return 'Possible match';
  }
};

const confidenceClass = (confidence: ProductSuggestion['confidence'], dark?: boolean) => {
  if (confidence === 'exact' || confidence === 'strong') {
    return dark
      ? 'bg-green-900/40 text-green-200 border-green-700'
      : 'bg-green-100 text-green-800 border-green-200';
  }
  return dark
    ? 'bg-amber-900/40 text-amber-200 border-amber-700'
    : 'bg-amber-100 text-amber-800 border-amber-200';
};

export const CatalogSuggestionsPanel = ({
  suggestions,
  isLoading = false,
  title = 'We may already have this',
  subtitle = 'Suggestions are assistive only. Confirm fit before ordering.',
  dark = false,
  onDismiss,
  dismissed = false,
}: CatalogSuggestionsPanelProps) => {
  if (dismissed) return null;
  if (!isLoading && suggestions.length === 0) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        dark ? 'border-gray-700 bg-slate-900' : 'border-teal-200 bg-teal-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className={`h-5 w-5 ${dark ? 'text-teal-400' : 'text-teal-600'}`} />
            <h3 className={`font-semibold ${dark ? 'text-gray-50' : 'text-gray-900'}`}>{title}</h3>
          </div>
          <Body className={`text-sm mt-1 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            {subtitle}
          </Body>
        </div>
        {onDismiss && (
          <Button type="button" variant="ghost" size="small" dark={dark} onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>

      {isLoading ? (
        <Body className={dark ? 'text-gray-400' : 'text-gray-600'}>Checking catalog…</Body>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const image = getProductImageUrl(suggestion.product.images?.[0]);
            return (
              <div
                key={suggestion.product._id}
                className={`flex gap-3 rounded-lg border p-3 ${
                  dark ? 'border-gray-700 bg-slate-950' : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md ${
                    dark ? 'bg-slate-800' : 'bg-gray-100'
                  }`}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={suggestion.product.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className={`h-6 w-6 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/products/${suggestion.product._id}`}
                      className={`font-medium hover:underline ${
                        dark ? 'text-teal-300' : 'text-teal-700'
                      }`}
                    >
                      {suggestion.product.name}
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${confidenceClass(
                        suggestion.confidence,
                        dark
                      )}`}
                    >
                      {suggestion.confidence === 'possible' ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : suggestion.confidence === 'exact' ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {confidenceLabel(suggestion.confidence)}
                    </span>
                  </div>
                  <Body className={`text-sm mt-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    MWK {suggestion.product.price.toLocaleString()}
                    {suggestion.product.oemPartNumber
                      ? ` · OEM ${suggestion.product.oemPartNumber}`
                      : ''}
                  </Body>
                  <Body className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {suggestion.reasons.join(' · ')}
                  </Body>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
