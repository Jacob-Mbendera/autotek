import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { clearComparison, removeFromComparison } from '../store/slices/comparisonSlice';
import { useCart } from '../hooks/useCart';
import { JournalButton, JournalLinkButton, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { ProductPlaceholderImage } from '../components/ProductPlaceholderImage';
import { getProductImageBlur, getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { X, ShoppingCart, Package, Check, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export const CompareProducts = () => {
  useEffect(() => {
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);

  const dispatch = useAppDispatch();
  const { addItem } = useCart();
  const { products } = useAppSelector((state) => state.comparison);

  const handleRemove = (productId: string) => {
    dispatch(removeFromComparison(productId));
  };

  const handleClear = () => {
    dispatch(clearComparison());
  };

  const handleAddToCart = (product: any) => {
    addItem({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: getProductImageUrl(product.images?.[0]),
    });
  };

  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center bg-white rounded-journal border border-journal-hairline py-20">
          <Package className="h-12 w-12 text-journal-faint mx-auto mb-4" />
          <CardHeading className="!text-[22px] mb-2">No products to compare</CardHeading>
          <JournalBody className="!text-journal-muted mb-6">
            Add products to comparison from the products page
          </JournalBody>
          <JournalLinkButton to="/products" className="mx-auto">
            <Package className="h-3.5 w-3.5" />
            Browse products
          </JournalLinkButton>
        </div>
      </div>
    );
  }

  const comparisonFields = [
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <PageHeading className="!text-[28px] sm:!text-[32px] mb-2">Compare products</PageHeading>
          <JournalBody className="!text-journal-muted">
            Compare {products.length} product{products.length > 1 ? 's' : ''} side by side
          </JournalBody>
        </div>
        <JournalButton variant="secondary" onClick={handleClear}>
          Clear comparison
        </JournalButton>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-journal border border-journal-ink overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-journal-sand border-b border-journal-hairline">
              <tr>
                <th className="px-6 py-4 text-left text-[12px] font-sans font-bold text-journal-body uppercase tracking-[0.06em] sticky left-0 bg-journal-sand z-10 min-w-[180px]">
                  Feature
                </th>
                {products.map((product) => (
                  <th
                    key={product._id}
                    className="px-6 py-5 text-center align-top min-w-[250px] relative"
                  >
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="absolute top-3 right-3 p-1 hover:bg-white rounded-full transition-colors"
                      aria-label="Remove from comparison"
                    >
                      <X className="h-3.5 w-3.5 text-journal-body" />
                    </button>

                    {(() => {
                      const { url, isPlaceholder, placeholderCategory } = resolveProductDisplayImage(
                        product.images,
                        product.category,
                        128
                      );
                      return (
                        <div className="mx-auto mb-3 w-28 h-28 rounded-journal overflow-hidden border border-journal-hairline">
                          {isPlaceholder ? (
                            <ProductPlaceholderImage
                              productName={product.name}
                              category={placeholderCategory ?? product.category}
                              size="sm"
                              className="h-full w-full"
                            />
                          ) : (
                            <OptimizedImage
                              src={url}
                              blurDataUrl={getProductImageBlur(product.images?.[0])}
                              alt={product.name}
                              width={128}
                              height={128}
                              className="w-28 h-28 object-cover"
                              priority={false}
                            />
                          )}
                        </div>
                      );
                    })()}

                    <h3 className="font-journal text-[16px] text-journal-ink mb-2 line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="mb-3">
                      <span className="font-journal text-[22px] text-journal-teal">
                        MWK {product.price.toLocaleString()}
                      </span>
                    </div>

                    <Link to={`/products/${product._id}`} className="block mb-2">
                      <JournalButton variant="secondary" className="w-full">
                        View details
                      </JournalButton>
                    </Link>

                    <JournalButton
                      variant="primary"
                      className="w-full"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to cart
                    </JournalButton>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-journal-divider">
              {comparisonFields.map((field) => (
                <tr key={field.key} className="hover:bg-journal-teal-tint/30 transition-colors">
                  <td className="px-6 py-4 text-[13px] font-sans font-semibold text-journal-ink sticky left-0 bg-white z-10">
                    {field.label}
                  </td>
                  {products.map((product) => (
                    <td key={product._id} className="px-6 py-4 text-center">
                      {field.key === 'status' ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sans font-semibold',
                            product.status === 'available'
                              ? 'bg-journal-teal-tint text-journal-teal'
                              : 'bg-journal-danger-bg text-journal-danger-text'
                          )}
                        >
                          {product.status === 'available' ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {product.status === 'available' ? 'Available' : 'Out of Stock'}
                        </span>
                      ) : field.key === 'description' ? (
                        <p className="text-[13px] font-sans text-journal-body line-clamp-3">
                          {product.description || 'N/A'}
                        </p>
                      ) : (
                        <p className="text-[13px] font-sans font-medium text-journal-ink">
                          {field.key === 'price'
                            ? `MWK ${product.price.toLocaleString()}`
                            : field.key === 'name'
                              ? product.name
                              : field.key === 'category'
                                ? product.category
                                : field.key === 'supplier'
                                  ? product.supplier || 'N/A'
                                  : field.key === 'stock'
                                    ? String(product.stock)
                                    : 'N/A'}
                        </p>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
