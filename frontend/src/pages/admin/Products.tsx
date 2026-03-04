import { useState } from 'react';
import { useGetProductsQuery, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation, useGetCategoriesQuery } from '../../store/api/productApi';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, H2, Body } from '../../components/ui/Typography';
import { Plus, Edit, Trash2, X, Package, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Product } from '../../store/api/productApi';

export const AdminProducts = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showModal, setShowModal] = useState(false);
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

  const { data, isLoading } = useGetProductsQuery({ page, limit });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

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
      } else {
        await createProduct(productData).unwrap();
      }
      handleCloseModal();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving product:', error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id).unwrap();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error deleting product:', error);
        }
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: Array.from(e.target.files) });
    }
  };

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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <AdminCard variant="table">
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
                {data?.products.map((product) => (
                  <tr key={product._id} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
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
                          onClick={() => handleDelete(product._id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
              <Body className="text-gray-400">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} products
              </Body>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
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
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-700 rounded-lg hover:border-teal-500 transition-colors bg-slate-900">
                      <ImageIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <Body className="text-gray-400">
                        {formData.images.length > 0
                          ? `${formData.images.length} file(s) selected`
                          : 'Choose images'}
                      </Body>
                    </div>
                  </label>
                </div>
                {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
                  <div className="mt-2">
                    <Body className="text-sm text-gray-400 mb-2">Current images:</Body>
                    <div className="flex gap-2 flex-wrap">
                      {editingProduct.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Product ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded"
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
    </div>
  );
};
