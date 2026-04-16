import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useGetOrderQuery } from '../store/api/orderApi';
import { useCreateReturnMutation } from '../store/api/returnApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getProductImageUrl } from '../utils/productImage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  ArrowLeft,
  Package,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
} from 'lucide-react';
import { ReturnReason, RefundMethod } from '@shared/types';

interface SelectedItem {
  productId: string;
  productName: string;
  productImage: string;
  maxQuantity: number;
  quantity: number;
  reason: string;
}

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'defective', label: 'Defective/Damaged' },
  { value: 'wrong-item', label: 'Wrong Item Received' },
  { value: 'not-as-described', label: 'Not as Described' },
  { value: 'changed-mind', label: 'Changed Mind' },
  { value: 'other', label: 'Other' },
];

const REFUND_METHODS: { value: RefundMethod; label: string }[] = [
  { value: 'original-payment', label: 'Original Payment Method' },
  { value: 'store-credit', label: 'Store Credit' },
];

export const RequestReturn = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const { data: orderData, isLoading: isLoadingOrder, error: orderError } = useGetOrderQuery(
    orderId ? { id: orderId } : { id: '' },
    { skip: !orderId }
  );

  const [createReturn, { isLoading: isSubmitting }] = useCreateReturnMutation();

  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [overallReason, setOverallReason] = useState<ReturnReason>('defective');
  const [comments, setComments] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original-payment');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const order = orderData?.order;

  // Check if order is eligible for return (30 days from completion)
  const isEligibleForReturn = () => {
    if (!order || order.status !== 'completed') return false;
    const completionDate = new Date(order.updatedAt || order.createdAt);
    const daysSinceCompletion = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCompletion <= 30;
  };

  // Handle item selection
  const handleItemToggle = (item: any) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.product._id)) {
      newSelected.delete(item.product._id);
    } else {
      newSelected.set(item.product._id, {
        productId: item.product._id,
        productName: item.product.name,
        productImage: getProductImageUrl(item.product.images?.[0]) || '',
        maxQuantity: item.quantity,
        quantity: item.quantity,
        reason: 'defective',
      });
    }
    setSelectedItems(newSelected);
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, quantity: number) => {
    const item = selectedItems.get(productId);
    if (item) {
      const newSelected = new Map(selectedItems);
      newSelected.set(productId, {
        ...item,
        quantity: Math.max(1, Math.min(quantity, item.maxQuantity)),
      });
      setSelectedItems(newSelected);
    }
  };

  // Handle reason change for item
  const handleItemReasonChange = (productId: string, reason: string) => {
    const item = selectedItems.get(productId);
    if (item) {
      const newSelected = new Map(selectedItems);
      newSelected.set(productId, { ...item, reason });
      setSelectedItems(newSelected);
    }
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      dispatch(showNotification({
        message: 'Maximum 10 images allowed',
        type: 'error',
      }));
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews
    const newPreviews: string[] = [];
    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newImages.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedItems.size === 0) {
      newErrors.items = 'Please select at least one item to return';
    }

    if (!overallReason) {
      newErrors.reason = 'Please select a return reason';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    if (!orderId || !order) {
      dispatch(showNotification({
        message: 'Order not found',
        type: 'error',
      }));
      return;
    }

    if (!isEligibleForReturn()) {
      dispatch(showNotification({
        message: 'This order is not eligible for return. Returns must be requested within 30 days of order completion.',
        type: 'error',
      }));
      return;
    }

    try {
      const returnItems = Array.from(selectedItems.values()).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        reason: item.reason,
      }));

      const guestInfo = !isAuthenticated && order.guestInfo
        ? {
            email: order.guestInfo.email,
            name: order.guestInfo.name,
            phone: order.guestInfo.phone,
          }
        : undefined;

      const result = await createReturn({
        orderId,
        items: returnItems,
        returnReason: overallReason,
        comments: comments.trim() || undefined,
        refundMethod,
        guestInfo,
        images: images.length > 0 ? images : undefined,
      }).unwrap();

      dispatch(showNotification({
        message: 'Return request submitted successfully!',
        type: 'success',
      }));

      // Navigate to return detail page
      const returnId = result.return._id;
      if (isAuthenticated) {
        navigate(`/returns/${returnId}`);
      } else if (order.guestInfo) {
        navigate(`/returns/${returnId}?email=${encodeURIComponent(order.guestInfo.email)}`);
      }
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to submit return request');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  if (!orderId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <H2>Order ID Required</H2>
          <Body className="mt-2 text-gray-600">Please provide an order ID to request a return.</Body>
          <Link to="/orders">
            <Button className="mt-4">View Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoadingOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <H2>Order Not Found</H2>
          <Body className="mt-2 text-gray-600">The order you're looking for doesn't exist or you don't have access to it.</Body>
          <Link to="/orders">
            <Button className="mt-4">View Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const eligible = isEligibleForReturn();
  const daysSinceCompletion = order.status === 'completed'
    ? Math.floor((Date.now() - new Date(order.updatedAt || order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Orders', href: '/orders' },
          { label: 'Request Return', href: '#' },
        ]}
      />

      <div className="mt-6">
        <Link to={`/orders/${orderId}`} className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Order
        </Link>

        <H1 className="mt-4">Request Return</H1>
        <Body className="text-gray-600 mt-2">Select items you'd like to return and provide details about your return request.</Body>
      </div>

      {!eligible && (
        <Card className="mt-6 p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
            <div>
              <Body className="font-medium text-amber-900">Return Window Expired</Body>
              <Body className="text-amber-700 text-sm mt-1">
                {order.status !== 'completed'
                  ? 'This order must be completed before you can request a return.'
                  : `This order was completed ${daysSinceCompletion} days ago. Returns must be requested within 30 days of order completion.`}
              </Body>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Order Items */}
        <Card className="p-6">
          <H2 className="mb-4">Select Items to Return</H2>
          {errors.items && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Body className="text-red-700 text-sm">{errors.items}</Body>
            </div>
          )}

          <div className="space-y-4">
            {order.items.map((item: any) => {
              const isSelected = selectedItems.has(item.product._id);
              const selectedItem = selectedItems.get(item.product._id);

              return (
                <div
                  key={item.product._id}
                  className={`border rounded-lg p-4 ${
                    isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleItemToggle(item)}
                      className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      disabled={!eligible}
                    />
                    <img
                      src={getProductImageUrl(item.product.images?.[0]) || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=100&q=80'}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <Body className="font-medium">{item.product.name}</Body>
                      <Body className="text-sm text-gray-600 mt-1">
                        Quantity: {item.quantity} × MWK {item.price.toLocaleString()}
                      </Body>
                      {isSelected && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Quantity
                            </label>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.product._id, (selectedItem?.quantity || 1) - 1)}
                                disabled={!selectedItem || selectedItem.quantity <= 1}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                max={selectedItem?.maxQuantity}
                                value={selectedItem?.quantity || 1}
                                onChange={(e) => handleQuantityChange(item.product._id, parseInt(e.target.value) || 1)}
                                className="w-20 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.product._id, (selectedItem?.quantity || 1) + 1)}
                                disabled={!selectedItem || selectedItem.quantity >= selectedItem.maxQuantity}
                              >
                                +
                              </Button>
                              <Body className="text-sm text-gray-600">
                                (max: {selectedItem?.maxQuantity})
                              </Body>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Reason for this item
                            </label>
                            <select
                              value={selectedItem?.reason || 'defective'}
                              onChange={(e) => handleItemReasonChange(item.product._id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                              {RETURN_REASONS.map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                  {reason.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Overall Return Reason */}
        <Card className="p-6">
          <H2 className="mb-4">Return Reason</H2>
          {errors.reason && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Body className="text-red-700 text-sm">{errors.reason}</Body>
            </div>
          )}
          <select
            value={overallReason}
            onChange={(e) => setOverallReason(e.target.value as ReturnReason)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            disabled={!eligible}
          >
            {RETURN_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </Card>

        {/* Comments */}
        <Card className="p-6">
          <H2 className="mb-4">Additional Comments</H2>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Please provide any additional details about your return..."
            disabled={!eligible}
          />
        </Card>

        {/* Image Upload */}
        <Card className="p-6">
          <H2 className="mb-4">Upload Photos (Optional)</H2>
          <Body className="text-sm text-gray-600 mb-4">
            Upload photos of the items you're returning. This helps us process your return faster.
          </Body>
          <div className="space-y-4">
            <label className="block">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={!eligible || images.length >= 10}
              />
              <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 transition-colors cursor-pointer">
                <Upload className="h-5 w-5 text-gray-400 mr-2" />
                <Body className="text-gray-600">
                  {images.length > 0 ? `${images.length} file(s) selected` : 'Choose images (max 10)'}
                </Body>
              </div>
            </label>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Refund Method */}
        <Card className="p-6">
          <H2 className="mb-4">Refund Method</H2>
          <div className="space-y-2">
            {REFUND_METHODS.map((method) => (
              <label key={method.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="refundMethod"
                  value={method.value}
                  checked={refundMethod === method.value}
                  onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                  disabled={!eligible}
                />
                <Body>{method.label}</Body>
              </label>
            ))}
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Link to={`/orders/${orderId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={!eligible || isSubmitting || selectedItems.size === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Return Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
