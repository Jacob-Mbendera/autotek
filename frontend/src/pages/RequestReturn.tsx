import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useGetOrderQuery } from '../store/api/orderApi';
import { useCreateReturnMutation, useGetReturnsQuery } from '../store/api/returnApi';
import { baseApi } from '../store/api/baseApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { ProductPlaceholderImage } from '../components/ProductPlaceholderImage';
import { Breadcrumb } from '../components/Breadcrumb';
import { JournalCard, JournalButton, JournalLinkButton, JournalInput, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
import {
  ArrowLeft,
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
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const { data: orderData, isLoading: isLoadingOrder, error: orderError } = useGetOrderQuery(
    orderId ? { id: orderId } : { id: '' },
    { skip: !orderId }
  );

  const { data: returnsData } = useGetReturnsQuery(undefined, {
    skip: !isAuthenticated || !orderId,
    refetchOnMountOrArgChange: true,
  });

  const [createReturn, { isLoading: isSubmitting }] = useCreateReturnMutation();

  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [overallReason, setOverallReason] = useState<ReturnReason>('defective');
  const [comments, setComments] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original-payment');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const order = orderData?.order;

  const existingReturn = returnsData?.returns?.find((ret) => {
    const returnOrderId = typeof ret.order === 'object' ? ret.order._id : ret.order;
    return (
      String(returnOrderId) === String(orderId) &&
      (ret.status === 'pending' || ret.status === 'approved')
    );
  });

  // Check if order is eligible for return (30 days from collection)
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
        message: 'This order is not eligible for return. Returns must be requested within 30 days of collection.',
        type: 'error',
      }));
      return;
    }

    if (existingReturn) {
      dispatch(showNotification({
        message: 'A return request already exists for this order',
        type: 'error',
      }));
      navigate(`/returns/${existingReturn._id}`);
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

      dispatch(
        baseApi.util.invalidateTags([
          'Return',
          { type: 'Return', id: 'LIST' },
          ...(result.return?._id
            ? [{ type: 'Return' as const, id: result.return._id }]
            : []),
        ])
      );

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-journal-warn-text mx-auto mb-4" />
          <CardHeading className="!text-[20px]">Order ID required</CardHeading>
          <JournalBody className="mt-2 !text-journal-muted">Please provide an order ID to request a return.</JournalBody>
          <JournalLinkButton to="/orders" className="mt-4 mx-auto">View orders</JournalLinkButton>
        </JournalCard>
      </div>
    );
  }

  if (isLoadingOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-journal-teal" />
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-journal-danger-text mx-auto mb-4" />
          <CardHeading className="!text-[20px]">Order not found</CardHeading>
          <JournalBody className="mt-2 !text-journal-muted">The order you're looking for doesn't exist or you don't have access to it.</JournalBody>
          <JournalLinkButton to="/orders" className="mt-4 mx-auto">View orders</JournalLinkButton>
        </JournalCard>
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
          { label: 'Request Return' },
        ]}
      />

      <div className="mt-6">
        <Link to={`/orders/${orderId}`} className="inline-flex items-center text-[12px] font-sans font-semibold tracking-[0.08em] uppercase text-journal-teal hover:underline mb-4">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to order
        </Link>

        <PageHeading className="!text-[28px] sm:!text-[32px] mt-4">Request return</PageHeading>
        <JournalBody className="!text-journal-muted mt-2">Select items you'd like to return and provide details about your return request.</JournalBody>
      </div>

      {!eligible && (
        <JournalCard className="mt-6 p-4 bg-journal-warn-bg border-journal-warn-bg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-journal-warn-text mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-sans font-medium text-[14px] text-journal-warn-text">
                {order.status !== 'completed' ? 'Order not collected yet' : 'Return window expired'}
              </p>
              <p className="text-journal-warn-text text-[13px] font-sans mt-1">
                {order.status !== 'completed'
                  ? 'Returns are only available after the order has been collected.'
                  : `This order was collected ${daysSinceCompletion} days ago. Returns must be requested within 30 days of collection.`}
              </p>
            </div>
          </div>
        </JournalCard>
      )}

      {existingReturn && (
        <JournalCard className="mt-6 p-4 bg-journal-teal-tint border-journal-teal-tint-border">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-journal-teal mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-sans font-medium text-[14px] text-journal-teal">Return already requested</p>
                <p className="text-journal-teal text-[13px] font-sans mt-1">
                  A return request already exists for this order. You can view its status instead of submitting again.
                </p>
              </div>
            </div>
            <JournalLinkButton to={`/returns/${existingReturn._id}`}>View return</JournalLinkButton>
          </div>
        </JournalCard>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Order Items */}
        <JournalCard className="p-6">
          <CardHeading className="!text-[19px] mb-4">Select items to return</CardHeading>
          {errors.items && (
            <div className="mb-4 p-3 bg-journal-danger-bg border border-journal-error-border rounded-journal">
              <p className="text-journal-danger-text text-[13px] font-sans">{errors.items}</p>
            </div>
          )}

          <div className="space-y-4">
            {order.items.map((item: any) => {
              const isSelected = selectedItems.has(item.product._id);
              const selectedItem = selectedItems.get(item.product._id);

              return (
                <div
                  key={item.product._id}
                  className={cn(
                    'border rounded-journal p-4',
                    isSelected ? 'border-journal-teal bg-journal-teal-tint' : 'border-journal-hairline'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleItemToggle(item)}
                      className="mt-1 h-4 w-4 text-journal-teal focus:ring-journal-teal border-journal-input-border rounded"
                      disabled={!eligible}
                    />
                    {(() => {
                      const { isPlaceholder, placeholderCategory } = resolveProductDisplayImage(
                        item.product.images,
                        item.product.category,
                        100
                      );
                      return isPlaceholder ? (
                        <ProductPlaceholderImage
                          productName={item.product.name}
                          category={placeholderCategory ?? item.product.category}
                          size="sm"
                          className="w-16 h-16 rounded-journal flex-shrink-0"
                        />
                      ) : (
                        <img
                          src={getProductImageUrl(item.product.images?.[0])}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-journal flex-shrink-0"
                        />
                      );
                    })()}
                    <div className="flex-1">
                      <p className="font-sans font-medium text-[14px] text-journal-ink">{item.product.name}</p>
                      <p className="text-[13px] font-sans text-journal-muted mt-1">
                        Quantity: {item.quantity} × MWK {item.price.toLocaleString()}
                      </p>
                      {isSelected && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
                              Return quantity
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.product._id, (selectedItem?.quantity || 1) - 1)}
                                disabled={!selectedItem || selectedItem.quantity <= 1}
                                className="w-9 h-9 flex items-center justify-center border border-journal-input-border rounded-journal text-journal-body hover:border-journal-ink transition-colors disabled:opacity-40"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={selectedItem?.maxQuantity}
                                value={selectedItem?.quantity || 1}
                                onChange={(e) => handleQuantityChange(item.product._id, parseInt(e.target.value) || 1)}
                                className="w-16 text-center px-2 py-2 border border-journal-input-border rounded-journal text-[13px] font-sans"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.product._id, (selectedItem?.quantity || 1) + 1)}
                                disabled={!selectedItem || selectedItem.quantity >= selectedItem.maxQuantity}
                                className="w-9 h-9 flex items-center justify-center border border-journal-input-border rounded-journal text-journal-body hover:border-journal-ink transition-colors disabled:opacity-40"
                              >
                                +
                              </button>
                              <span className="text-[12px] font-sans text-journal-faint">
                                (max: {selectedItem?.maxQuantity})
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
                              Reason for this item
                            </label>
                            <select
                              value={selectedItem?.reason || 'defective'}
                              onChange={(e) => handleItemReasonChange(item.product._id, e.target.value)}
                              className="w-full px-3 py-2.5 text-[13px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal bg-white"
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
        </JournalCard>

        {/* Overall Return Reason */}
        <JournalCard className="p-6">
          <CardHeading className="!text-[19px] mb-4">Return reason</CardHeading>
          {errors.reason && (
            <div className="mb-4 p-3 bg-journal-danger-bg border border-journal-error-border rounded-journal">
              <p className="text-journal-danger-text text-[13px] font-sans">{errors.reason}</p>
            </div>
          )}
          <select
            value={overallReason}
            onChange={(e) => setOverallReason(e.target.value as ReturnReason)}
            className="w-full px-3 py-2.5 text-[13px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal bg-white"
            disabled={!eligible}
          >
            {RETURN_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </JournalCard>

        {/* Comments */}
        <JournalCard className="p-6">
          <CardHeading className="!text-[19px] mb-4">Additional comments</CardHeading>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="w-full px-3.5 py-3 text-[14px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal resize-none"
            placeholder="Please provide any additional details about your return..."
            disabled={!eligible}
          />
        </JournalCard>

        {/* Image Upload */}
        <JournalCard className="p-6">
          <CardHeading className="!text-[19px] mb-4">Upload photos (optional)</CardHeading>
          <JournalBody className="!text-journal-muted mb-4">
            Upload photos of the items you're returning. This helps us process your return faster.
          </JournalBody>
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
              <div className="flex items-center justify-center px-4 py-3 border border-dashed border-journal-input-border rounded-journal hover:border-journal-teal transition-colors cursor-pointer">
                <Upload className="h-4 w-4 text-journal-faint mr-2" />
                <span className="text-[13px] font-sans text-journal-body">
                  {images.length > 0 ? `${images.length} file(s) selected` : 'Choose images (max 10)'}
                </span>
              </div>
            </label>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-journal border border-journal-hairline"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-journal-danger-text text-white rounded-full p-1 hover:opacity-90"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </JournalCard>

        {/* Refund Method */}
        <JournalCard className="p-6">
          <CardHeading className="!text-[19px] mb-4">Refund method</CardHeading>
          <div className="space-y-2">
            {REFUND_METHODS.map((method) => (
              <label key={method.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="refundMethod"
                  value={method.value}
                  checked={refundMethod === method.value}
                  onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                  className="h-4 w-4 text-journal-teal focus:ring-journal-teal"
                  disabled={!eligible}
                />
                <span className="text-[14px] font-sans text-journal-body">{method.label}</span>
              </label>
            ))}
          </div>
        </JournalCard>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <Link to={`/orders/${orderId}`}>
            <JournalButton type="button" variant="secondary">Cancel</JournalButton>
          </Link>
          <JournalButton type="submit" variant="primary" disabled={!eligible || !!existingReturn || isSubmitting || selectedItems.size === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Submit return request
              </>
            )}
          </JournalButton>
        </div>
      </form>
    </div>
  );
};
