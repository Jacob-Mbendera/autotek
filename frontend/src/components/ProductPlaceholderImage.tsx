import { cn } from '../utils/cn';
import { getPlaceholderGradientClass } from '../utils/productImage';

export type ProductPlaceholderSize = 'sm' | 'md' | 'lg';

export interface ProductPlaceholderImageProps {
  productName: string;
  category?: string;
  className?: string;
  size?: ProductPlaceholderSize;
}

const sizeClasses: Record<ProductPlaceholderSize, string> = {
  sm: 'text-[10px] sm:text-xs line-clamp-2 px-2',
  md: 'text-sm line-clamp-2 px-3',
  lg: 'text-2xl md:text-3xl line-clamp-3 px-6',
};

export const ProductPlaceholderImage = ({
  productName,
  category,
  className,
  size = 'md',
}: ProductPlaceholderImageProps) => {
  return (
    <div
      role="img"
      aria-label={productName}
      className={cn(
        'flex h-full w-full items-center justify-center bg-gradient-to-br',
        getPlaceholderGradientClass(category),
        className
      )}
    >
      <span className={cn('text-center font-bold text-white leading-snug', sizeClasses[size])}>
        {productName}
      </span>
    </div>
  );
};
