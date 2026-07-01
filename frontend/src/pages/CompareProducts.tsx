import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { clearComparison, removeFromComparison } from '../store/slices/comparisonSlice';
import { addItem } from '../store/slices/cartSlice';
import { Button } from '../components/ui/Button';
import { H1, H2, H4, Body } from '../components/ui/Typography';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { ProductPlaceholderImage } from '../components/ProductPlaceholderImage';
import { getProductImageBlur, getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { X, ShoppingCart, Package, Check, XCircle } from 'lucide-react';

export const CompareProducts = () => {
  useEffect(() => {
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);

  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.comparison);

  const handleRemove = (productId: string) => {
    dispatch(removeFromComparison(productId));
  };

  const handleClear = () => {
    dispatch(clearComparison());
  };

  const handleAddToCart = (product: any) => {
    dispatch(
      addItem({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        image: getProductImageUrl(product.images?.[0]),
      })
    );
  };

  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center bg-gray-50 rounded-lg border-2 border-gray-200 py-20">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H2 className="text-gray-700 text-xl font-semibold mb-2">No products to compare</H2>
          <Body className="text-gray-600 mb-6">
            Add products to comparison from the products page
          </Body>
          <Link to="/products">
            <Button variant="primary" className="flex items-center gap-2 mx-auto">
              <Package className="h-4 w-4" />
              Browse Products
            </Button>
          </Link>
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <H1 className="text-3xl font-bold text-gray-900 mb-2">Compare Products</H1>
          <Body className="text-gray-600">
            Compare {products.length} product{products.length > 1 ? 's' : ''} side by side
          </Body>
        </div>
        <Button variant="secondary" onClick={handleClear}>
          Clear Comparison
        </Button>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  Feature
                </th>
                {products.map((product) => (
                  <th
                    key={product._id}
                    className="px-6 py-4 text-center align-top min-w-[250px] relative"
                  >
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                      aria-label="Remove from comparison"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    {(() => {
                      const { url, isPlaceholder, placeholderCategory } = resolveProductDisplayImage(
                        product.images,
                        product.category,
                        128
                      );
                      return (
                        <div className="mx-auto mb-3 w-32 h-32 rounded-lg overflow-hidden">
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
                              className="w-32 h-32 object-cover rounded-lg"
                              priority={false}
                            />
                          )}
                        </div>
                      );
                    })()}
                    
                    <H4 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </H4>
                    
                    <div className="mb-3">
                      <Body className="text-2xl font-bold text-teal-600">
                        MWK {product.price.toLocaleString()}
                      </Body>
                    </div>
                    
                    <Link to={`/products/${product._id}`}>
                      <Button variant="secondary" size="small" className="mb-2 w-full">
                        View Details
                      </Button>
                    </Link>
                    
                    <Button
                      variant="primary"
                      size="small"
                      className="w-full"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add to Cart
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparisonFields.map((field) => (
                <tr key={field.key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 sticky left-0 bg-white z-10">
                    {field.label}
                  </td>
                  {products.map((product) => (
                    <td key={product._id} className="px-6 py-4 text-center">
                      {field.key === 'status' ? (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            product.status === 'available'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {product.status === 'available' ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {product.status === 'available' ? 'Available' : 'Out of Stock'}
                        </span>
                      ) : field.key === 'description' ? (
                        <Body className="text-sm text-gray-700 line-clamp-3">
                          {product.description || 'N/A'}
                        </Body>
                      ) : (
                        <Body className="text-sm text-gray-900 font-medium">
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
                        </Body>
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
