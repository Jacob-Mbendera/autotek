import { useParams, useNavigate } from 'react-router-dom';
import { useGetProductQuery } from '../store/api/productApi';
import { useAppDispatch } from '../store/types';
import { addItem } from '../store/slices/cartSlice';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { ShoppingCart, ArrowLeft, Package, DollarSign } from 'lucide-react';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data, isLoading, error } = useGetProductQuery(id!);

  const handleAddToCart = () => {
    if (data?.product) {
      dispatch(
        addItem({
          productId: data.product._id,
          price: data.product.price,
          quantity: 1,
          image: data.product.images?.[0],
        })
      );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Body className="text-gray-600">Loading product...</Body>
        </div>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Body className="text-red-600">Product not found.</Body>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/products')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const product = data.product;
  const isOutOfStock = product.status === 'out-of-stock' || product.stock === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        size="small"
        onClick={() => navigate('/products')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Products
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          {product.images && product.images.length > 0 ? (
            <>
              <div className="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.slice(1, 5).map((image, index) => (
                    <div
                      key={index}
                      className="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 2}`}
                        className="w-full h-20 object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <H1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</H1>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl font-bold text-teal-600">
                MWK {product.price.toLocaleString()}
              </span>
              {isOutOfStock && (
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Package className="h-5 w-5" />
              <Body>
                <strong>Category:</strong> {product.category}
              </Body>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Package className="h-5 w-5" />
              <Body>
                <strong>Stock:</strong> {product.stock} available
              </Body>
            </div>

            {product.supplier && (
              <div className="flex items-center gap-2 text-gray-600">
                <Package className="h-5 w-5" />
                <Body>
                  <strong>Supplier:</strong> {product.supplier}
                </Body>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <Body className="text-gray-600 whitespace-pre-line">{product.description}</Body>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="primary"
              size="default"
              className="w-full"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
