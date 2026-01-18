import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetProductsQuery, useGetCategoriesQuery } from '../store/api/productApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { setFilters, clearFilters, setPagination } from '../store/slices/productSlice';
import { ProductCard } from '../components/ProductCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { Search, Filter, X, Settings, ChevronRight, Cog, CircleStop, Zap, Wrench, Package } from 'lucide-react';

export const Products = () => {
  const dispatch = useAppDispatch();
  const { filters, pagination } = useAppSelector((state) => state.product);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(true);
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice || 5000,
    max: filters.maxPrice || 50000000,
  });

  const { data, isLoading, error } = useGetProductsQuery({
    page: pagination.page,
    limit: pagination.limit,
    ...filters,
  });

  const { data: categoriesData } = useGetCategoriesQuery();

  useEffect(() => {
    if (data?.pagination) {
      dispatch(
        setPagination({
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        })
      );
    }
  }, [data, dispatch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchTerm || undefined }));
  };

  const handleCategoryChange = (category: string) => {
    dispatch(setFilters({ category: category || undefined }));
  };

  const handlePriceRangeChange = (min: number, max: number) => {
    setPriceRange({ min, max });
  };

  const handleApplyFilters = () => {
    dispatch(setFilters({ 
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
    }));
  };

  const handleResetFilters = () => {
    dispatch(clearFilters());
    setSearchTerm('');
    setPriceRange({ min: 5000, max: 50000000 });
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPagination({ page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Object.keys(filters).length > 0;
  const startItem = data?.pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = data?.pagination 
    ? Math.min(pagination.page * pagination.limit, data.pagination.total) 
    : 0;
  const totalItems = data?.pagination?.total || 0;

  // Category icons mapping using lucide-react icons
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      'Engine Parts': Cog,
      'Braking System': CircleStop,
      'Electrical': Zap,
      'Suspension': Wrench,
    };
    const IconComponent = iconMap[category] || Package;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-4" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li>
            <Link to="/" className="hover:text-teal-600 transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="text-gray-900 font-medium">Spare Parts</li>
        </ol>
      </nav>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for brake pads, oil filters, spark plugs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-3 text-base"
          />
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Category Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">CATEGORY</h3>
              <div className="space-y-2">
                {categoriesData?.categories && Array.isArray(categoriesData.categories) && categoriesData.categories.length > 0 ? (
                  categoriesData.categories.map((cat) => {
                    const isSelected = filters.category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {getCategoryIcon(cat)}
                        <span>{cat}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 py-2">Loading categories...</div>
                )}
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !filters.category
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>All Categories</span>
                </button>
              </div>
            </div>

            {/* Price Range Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">PRICE RANGE (MWK)</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Min {priceRange.min.toLocaleString()}</span>
                    <span className="text-sm text-gray-600">Max {priceRange.max.toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="50000000"
                      step="1000"
                      value={priceRange.min}
                      onChange={(e) => handlePriceRangeChange(Number(e.target.value), priceRange.max)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <input
                      type="range"
                      min="0"
                      max="50000000"
                      step="1000"
                      value={priceRange.max}
                      onChange={(e) => handlePriceRangeChange(priceRange.min, Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Apply Filters Button */}
            <Button
              variant="primary"
              size="default"
              className="w-full"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header with Title and Count */}
          <div className="flex items-center justify-between mb-6">
            <H1 className="text-2xl font-bold text-gray-900">
              {filters.category || 'All Products'}
            </H1>
            {data?.pagination && (
              <Body className="text-gray-600">
                Showing {startItem}-{endItem} of {totalItems} products
              </Body>
            )}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap mb-6">
              {filters.category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                  {filters.category}
                  <button
                    onClick={() => handleCategoryChange('')}
                    className="hover:text-teal-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.minPrice !== undefined && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                  Min: MWK {filters.minPrice.toLocaleString()}
                  <button
                    onClick={() => dispatch(setFilters({ minPrice: undefined }))}
                    className="hover:text-teal-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.maxPrice !== undefined && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                  Max: MWK {filters.maxPrice.toLocaleString()}
                  <button
                    onClick={() => dispatch(setFilters({ maxPrice: undefined }))}
                    className="hover:text-teal-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <Body className="text-gray-600">Loading products...</Body>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Body className="text-red-600">Error loading products. Please try again.</Body>
            </div>
          ) : !data?.products || data.products.length === 0 ? (
            <div className="text-center py-12">
              <Body className="text-gray-600">No products found. Try adjusting your filters.</Body>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
