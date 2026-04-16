import { useState, useRef, useEffect } from 'react';
import { useGetProductsQuery, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation, useGetCategoriesQuery } from '../../store/api/productApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, H2, Body } from '../../components/ui/Typography';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ImageCropModal } from '../../components/admin/ImageCropModal';
import { Plus, Edit, Trash2, X, Package, Loader2, Image as ImageIcon, Search, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Product } from '../../store/api/productApi';

export const AdminProducts = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'available' | 'out-of-stock' | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    supplier: '',
    status: 'available' as 'available' | 'out-of-stock',
    images: [] as File[],
  });

  // Track which product images have errored to prevent flickering
  const imageErrorsRef = useRef<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState('');
  const [cropMimeType, setCropMimeType] = useState('image/jpeg');
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropQueueIndex, setCropQueueIndex] = useState(0);
  const [imagesSnapshotBeforeCrop, setImagesSnapshotBeforeCrop] = useState<File[] | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const cropQueueRef = useRef<File[]>([]);
  const cropQueueIndexRef = useRef(0);
  const croppedResultsRef = useRef<File[]>([]);

  const { data, isLoading } = useGetProductsQuery({
    page,
    limit,
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // Clear image errors when products change (page, filters, etc.)
  useEffect(() => {
    imageErrorsRef.current.clear();
  }, [data?.products, page, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    setImagePreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return formData.images.map((file) => URL.createObjectURL(file));
    });
    return () => {
      setImagePreviewUrls((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
    };
  }, [formData.images]);

  // Get placeholder image based on category
  const getPlaceholderImage = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    const placeholders: Record<string, string> = {
      'engine parts': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'brake parts': 'https://images.unsplash.com/photo-1486262715619-67b35e0b08d3?w=600&q=80',
      'braking system': 'https://images.unsplash.com/photo-1593642532400-26709d8ae933?w=600&q=80',
      'electrical': 'https://images.unsplash.com/photo-1581092336000-3e3b3b3b3b3b?w=600&q=80',
      'suspension': 'https://images.unsplash.com/photo-1581092336000-3e3b3b3b3b3b?w=600&q=80',
      'filters': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'transmission': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',
      'cooling system': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
      'exhaust system': 'https://images.unsplash.com/photo-1593642532400-26709d8ae933?w=600&q=80',
      'body parts': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',
    };
    return placeholders[cat] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80';
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        supplier: product.supplier || '',
        status: product.status,
        images: [],
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        price: '',
        stock: '',
        supplier: '',
        status: 'available',
        images: [],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropQueue([]);
    setCropQueueIndex(0);
    cropQueueRef.current = [];
    cropQueueIndexRef.current = 0;
    croppedResultsRef.current = [];
    setImagesSnapshotBeforeCrop(null);
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      stock: '',
      supplier: '',
      status: 'available',
      images: [],
    });
  };

  const beginCropSession = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setImagesSnapshotBeforeCrop(formData.images);
    setCropQueue(imageFiles);
    setCropQueueIndex(0);
    cropQueueRef.current = imageFiles;
    cropQueueIndexRef.current = 0;
    croppedResultsRef.current = [];

    const first = imageFiles[0];
    const url = URL.createObjectURL(first);
    setCropImageSrc(url);
    setCropFileName(first.name);
    setCropMimeType(first.type || 'image/jpeg');
    setCropModalOpen(true);
  };

  const finishCropSession = (finalFiles: File[]) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropQueue([]);
    setCropQueueIndex(0);
    cropQueueRef.current = [];
    cropQueueIndexRef.current = 0;
    croppedResultsRef.current = [];
    setImagesSnapshotBeforeCrop(null);
    setFormData((prev) => ({ ...prev, images: finalFiles }));
  };

  const abortCropSession = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropQueue([]);
    setCropQueueIndex(0);
    cropQueueRef.current = [];
    cropQueueIndexRef.current = 0;
    croppedResultsRef.current = [];
    if (imagesSnapshotBeforeCrop) {
      setFormData((prev) => ({ ...prev, images: imagesSnapshotBeforeCrop }));
    }
    setImagesSnapshotBeforeCrop(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        supplier: formData.supplier || undefined,
        status: formData.status,
        images: formData.images.length > 0 ? formData.images : undefined,
      };

      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, data: productData }).unwrap();
        dispatch(showNotification({ message: 'Product updated successfully', type: 'success' }));
      } else {
        await createProduct(productData).unwrap();
        dispatch(showNotification({ message: 'Product created successfully', type: 'success' }));
      }
      handleCloseModal();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to save product. Please try again.');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingProductId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProductId) return;
    try {
      await deleteProduct(deletingProductId).unwrap();
      dispatch(showNotification({ message: 'Product deleted successfully', type: 'success' }));
      setShowDeleteModal(false);
      setDeletingProductId(null);
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to delete product. Please try again.');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
      setShowDeleteModal(false);
      setDeletingProductId(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      beginCropSession(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      beginCropSession(files);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const filteredProducts = data?.products || [];
  const hasActiveFilters = searchTerm || categoryFilter || statusFilter;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <H1 className="text-3xl font-bold text-gray-50 mb-2">Product Management</H1>
          <Body className="text-gray-400">Manage your product catalog</Body>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search and Filters */}
      <AdminCard variant="default" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                dark
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                placeholder="Search by product name or description"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            >
              <option value="">All Categories</option>
              {categoriesData?.categories.map((cat: { name: string; count: number } | string) => {
                const categoryName = typeof cat === 'string' ? cat : cat.name;
                return (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'available' | 'out-of-stock' | '');
                setPage(1);
              }}
              className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-4 flex items-center justify-end">
            <Button
              variant="secondary"
              size="small"
              dark
              onClick={handleClearFilters}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </AdminCard>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <AdminCard variant="table">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <Body className="text-gray-400 text-lg font-semibold mb-2">No products found</Body>
              <Body className="text-gray-500 mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first product'}
              </Body>
              {!hasActiveFilters && (
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-400">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400">Stock</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-400">Status</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const firstImage = product.images?.[0];
                      const hasValidImage = firstImage && 
                        typeof firstImage === 'string' && 
                        firstImage.trim() !== '';
                      const hasErrored = imageErrorsRef.current.has(product._id);
                      const displayImage = (hasValidImage && !hasErrored) ? firstImage : getPlaceholderImage(product.category);

                      const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                        const target = e.target as HTMLImageElement;
                        const placeholder = getPlaceholderImage(product.category);
                        
                        // If we're already showing the placeholder and it failed, use a data URL as ultimate fallback
                        if (target.src === placeholder || target.src.includes('unsplash.com')) {
                          // Use a simple 1x1 transparent pixel as ultimate fallback
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23334155"/%3E%3C/svg%3E';
                          imageErrorsRef.current.add(product._id);
                          return;
                        }
                        
                        // Only handle error once per product to prevent flickering
                        if (!imageErrorsRef.current.has(product._id)) {
                          imageErrorsRef.current.add(product._id);
                          // Only update if current src is not already the placeholder
                          if (target.src !== placeholder) {
                            target.src = placeholder;
                          }
                        }
                      };

                      return (
                        <tr key={product._id} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 flex-shrink-0">
                                <img
                                  src={displayImage}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                  onError={handleImageError}
                                />
                              </div>
                              <div>
                                <Body className="font-medium text-gray-50">{product.name}</Body>
                                <Body className="text-sm text-gray-400 line-clamp-1">
                                  {product.description}
                                </Body>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Body className="text-gray-300">{product.category}</Body>
                          </td>
                          <td className="py-3 px-4">
                            <Body className="font-medium text-gray-50">
                              MWK {product.price.toLocaleString()}
                            </Body>
                          </td>
                          <td className="py-3 px-4">
                            <Body className="text-gray-300">{product.stock}</Body>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                product.status === 'available'
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-red-500/20 text-red-500'
                              }`}
                            >
                              {product.status === 'available' ? 'Available' : 'Out of Stock'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="small"
                                dark
                                onClick={() => handleOpenModal(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="small"
                                dark
                                onClick={() => handleDeleteClick(product._id)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data?.pagination && (data.pagination.totalPages > 1 || (data.pagination.total && data.pagination.total > limit)) && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                  <Body className="text-gray-400">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total || 0)} of {data.pagination.total || 0} products
                  </Body>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      dark
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="gap-1.5"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Body className="text-gray-400 px-3">
                      Page {page} of {data.pagination.totalPages || Math.ceil((data.pagination.total || 0) / limit)}
                    </Body>
                    <Button
                      variant="secondary"
                      size="small"
                      dark
                      onClick={() => setPage(page + 1)}
                      disabled={page >= (data.pagination.totalPages || Math.ceil((data.pagination.total || 0) / limit))}
                      className="gap-1.5"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </AdminCard>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <AdminCard variant="default" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <H2 className="text-2xl font-bold text-gray-50">
                {editingProduct ? 'Edit Product' : 'Create Product'}
              </H2>
              <Button variant="ghost" size="small" dark onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                dark
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter product name"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Enter product description"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                >
                  <option value="">Select category</option>
                  {categoriesData?.categories.map((cat: { name: string; count: number } | string) => {
                    const categoryName = typeof cat === 'string' ? cat : cat.name;
                    return (
                      <option key={categoryName} value={categoryName}>
                        {categoryName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  dark
                  label="Price (MWK)"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="0.00"
                />

                <Input
                  dark
                  label="Stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>

              <Input
                dark
                label="Supplier (Optional)"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Enter supplier name"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'available' | 'out-of-stock' })
                  }
                  className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                >
                  <option value="available">Available</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Images {!editingProduct && '(Optional)'}
                </label>
                <div
                  className={`flex items-center gap-4 transition-all ${
                    isDragging ? 'scale-105' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div
                      className={`flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-lg transition-all ${
                        isDragging
                          ? 'border-teal-400 bg-teal-900/20 scale-105'
                          : 'border-gray-700 bg-slate-900 hover:border-teal-500'
                      }`}
                    >
                      <ImageIcon className={`h-8 w-8 mb-2 transition-colors ${
                        isDragging ? 'text-teal-400' : 'text-gray-400'
                      }`} />
                      <Body className={`text-center transition-colors ${
                        isDragging ? 'text-teal-300' : 'text-gray-400'
                      }`}>
                        {isDragging ? (
                          'Drop images here'
                        ) : formData.images.length > 0 ? (
                          `${formData.images.length} file(s) selected`
                        ) : (
                          <>
                            <span className="font-semibold">Click to upload</span> or drag and drop
                            <br />
                            <span className="text-xs text-gray-500">PNG, JPG, WebP up to 10MB</span>
                          </>
                        )}
                      </Body>
                    </div>
                  </label>
                </div>

                {/* Preview selected files */}
                {formData.images.length > 0 && (
                  <div className="mt-3">
                    <Body className="text-sm text-gray-400 mb-2">Selected files:</Body>
                    <div className="flex gap-2 flex-wrap">
                      {formData.images.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden">
                            <img
                              src={imagePreviewUrls[idx] || ''}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                            <Body className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity text-center px-1 truncate">
                              {file.name}
                            </Body>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
                  <div className="mt-3">
                    <Body className="text-sm text-gray-400 mb-2">Current images:</Body>
                    <div className="flex gap-2 flex-wrap">
                      {editingProduct.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Product ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getPlaceholderImage(editingProduct.category);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" dark onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingProduct ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </Button>
              </div>
            </form>
          </AdminCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingProductId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dark
        isLoading={isDeleting}
      />

      {cropModalOpen && cropImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          imageSrc={cropImageSrc}
          fileName={cropFileName}
          mimeType={cropMimeType}
          queuePosition={cropQueueIndex + 1}
          queueTotal={cropQueue.length}
          onClose={abortCropSession}
          onConfirm={(croppedFile) => {
            croppedResultsRef.current = [...croppedResultsRef.current, croppedFile];
            const nextIndex = cropQueueIndexRef.current + 1;

            if (nextIndex < cropQueueRef.current.length) {
              const next = cropQueueRef.current[nextIndex];
              cropQueueIndexRef.current = nextIndex;
              setCropQueueIndex(nextIndex);
              setCropImageSrc((currentSrc) => {
                if (currentSrc) URL.revokeObjectURL(currentSrc);
                return URL.createObjectURL(next);
              });
              setCropFileName(next.name);
              setCropMimeType(next.type || 'image/jpeg');
              return;
            }

            finishCropSession(croppedResultsRef.current);
          }}
        />
      )}
    </div>
  );
};
