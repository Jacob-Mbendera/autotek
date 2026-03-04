import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGetProductsQuery, useGetCategoriesQuery } from '../store/api/productApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { setFilters, clearFilters, setPagination, setViewMode } from '../store/slices/productSlice';
import { ProductCard } from '../components/ProductCard';
import { ProductCardList } from '../components/ProductCardList';
import { Pagination } from '../components/ui/Pagination';
import { ProductCardSkeleton, ProductCardListSkeleton } from '../components/ProductCardSkeleton';
import { QuickViewModal } from '../components/QuickViewModal';
import { ProductComparison } from '../components/ProductComparison';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import { FilterDrawer } from '../components/FilterDrawer';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { Search, Filter, X, Settings, ChevronRight, Cog, CircleStop, Zap, Wrench, Package, Grid3x3, List, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    // Add page transition class on mount
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);
  
  const dispatch = useAppDispatch();
  const { filters, pagination, viewMode } = useAppSelector((state) => state.product);
  
  // Initialize filters from URL params on mount only
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlSearch = searchParams.get('search');
    const urlMinPrice = searchParams.get('minPrice');
    const urlMaxPrice = searchParams.get('maxPrice');
    const urlStockStatus = searchParams.get('stockStatus');
    const urlPage = searchParams.get('page');
    const urlLimit = searchParams.get('limit');
    
    const urlFilters: any = {};
    if (urlCategory) urlFilters.category = urlCategory;
    if (urlSearch) urlFilters.search = urlSearch;
    if (urlMinPrice) urlFilters.minPrice = Number(urlMinPrice);
    if (urlMaxPrice) urlFilters.maxPrice = Number(urlMaxPrice);
    if (urlStockStatus) urlFilters.stockStatus = urlStockStatus;
    
    if (Object.keys(urlFilters).length > 0) {
      dispatch(setFilters(urlFilters));
    }
    
    if (urlPage) {
      dispatch(setPagination({ page: Number(urlPage) }));
    }
    if (urlLimit) {
      dispatch(setPagination({ limit: Number(urlLimit) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Sync filters to URL (but avoid infinite loop)
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
    if (pagination.page > 1) params.set('page', pagination.page.toString());
    if (pagination.limit !== 12) params.set('limit', pagination.limit.toString());
    
    const currentParams = searchParams.toString();
    const newParams = params.toString();
    
    // Only update if different to avoid loops
    if (currentParams !== newParams) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, pagination.page, pagination.limit, searchParams, setSearchParams]);
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice || 5000,
    max: filters.maxPrice || 50000000,
  });
  const [quickViewProduct, setQuickViewProduct] = useState<{ _id: string; name: string; description: string; category: string; price: number; stock: number; images: string[]; supplier?: string; status: 'available' | 'out-of-stock'; createdAt: string; updatedAt: string } | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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
    <div className="w-full">
      {/* Hero/Banner Section */}
      <section className="relative bg-gradient-to-br from-teal-50 via-white to-teal-50 overflow-hidden mb-12">
        {/* Background decoration */}
        <div className="absolute inset-0 geometric-pattern opacity-20"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Breadcrumbs */}
          <nav className="mb-6" aria-label="Breadcrumb">
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-8">
            {/* Left side - Title and description */}
            <div>
              <H1 className="text-4xl lg:text-5xl font-bold mb-4 animate-fade-in">
                Find Your <span className="text-teal-600">Auto Parts</span>
              </H1>
              <Body className="text-lg text-gray-700 mb-6 max-w-xl">
                Browse our extensive catalog of quality automotive spare parts. Search by category, price, or product name.
              </Body>
              
              {/* Enhanced Search Bar with Autocomplete */}
              <form onSubmit={handleSearch} className="relative max-w-2xl">
                <SearchAutocomplete
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                  onSelect={(term) => {
                    setSearchTerm(term);
                    dispatch(setFilters({ search: term || undefined }));
                  }}
                  className="mb-2"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  Search
                </Button>
              </form>
            </div>
            
            {/* Right side - Category showcase - Removed as it's redundant with quick filters below */}
          </div>
          
          {/* Quick filter chips */}
          {categoriesData?.categories && categoriesData.categories.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Quick filters:</span>
              {categoriesData.categories.slice(0, 4).map((cat: { name: string; count: number }) => {
                const categoryName = typeof cat === 'string' ? cat : cat.name;
                if (!categoryName) return null;
                return (
                  <Link
                    key={categoryName}
                    to={`/products?category=${encodeURIComponent(categoryName)}`}
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      filters.category === categoryName
                        ? 'bg-teal-600 text-white shadow-lg'
                        : 'bg-white text-gray-900 hover:bg-teal-50 hover:text-teal-600 border-2 border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <span>{categoryName}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Quick filters:</span>
              <span className="text-sm text-gray-500">Loading categories...</span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-col lg:flex-row gap-8">
        {/* Enhanced Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 sticky top-24 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <span className="h-5 w-5 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline transition-all"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
                >
                  {filtersCollapsed ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            <div className={filtersCollapsed ? 'hidden lg:block' : ''}>

            {/* Enhanced Category Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Category</h3>
              </div>
              <div className="space-y-2">
                {categoriesData?.categories && Array.isArray(categoriesData.categories) && categoriesData.categories.length > 0 ? (
                  categoriesData.categories.map((cat: { name: string; count: number } | string) => {
                    const categoryName = typeof cat === 'string' ? cat : cat.name;
                    const isSelected = filters.category === categoryName;
                    return (
                      <button
                        key={categoryName}
                        onClick={() => handleCategoryChange(categoryName)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-2 border-teal-300 shadow-md transform scale-105'
                            : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:shadow-sm'
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${isSelected ? 'bg-teal-200' : 'bg-gray-100'}`}>
                          {getCategoryIcon(categoryName)}
                        </div>
                        <span className="flex-1 text-left">{categoryName}</span>
                        {typeof cat !== 'string' && cat.count > 0 && (
                          <span className={`text-xs ${isSelected ? 'text-teal-600' : 'text-gray-500'}`}>
                            ({cat.count})
                          </span>
                        )}
                        {isSelected && (
                          <div className="h-2 w-2 bg-teal-600 rounded-full animate-pulse"></div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 py-2">Loading categories...</div>
                )}
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    !filters.category
                      ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-2 border-teal-300 shadow-md'
                      : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span className="flex-1 text-left">All Categories</span>
                </button>
              </div>
            </div>

            {/* Stock Status Filter */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Stock Status</h3>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All', icon: Package },
                  { value: 'in-stock', label: 'In Stock', icon: CheckCircle },
                  { value: 'low-stock', label: 'Low Stock', icon: AlertCircle },
                  { value: 'out-of-stock', label: 'Out of Stock', icon: X },
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = (filters.stockStatus || 'all') === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => dispatch(setFilters({ stockStatus: option.value as any }))}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-2 border-teal-300 shadow-md'
                          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                      <span className="flex-1 text-left">{option.label}</span>
                      {isSelected && (
                        <div className="h-2 w-2 bg-teal-600 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Price Range Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Price Range (MWK)</h3>
              </div>
              <div className="space-y-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div>
                  {/* Price Input Fields */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Price</label>
                      <input
                        type="number"
                        min="0"
                        max="50000000"
                        step="1000"
                        value={priceRange.min}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(50000000, Number(e.target.value) || 0));
                          handlePriceRangeChange(value, priceRange.max);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        placeholder="Min"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Price</label>
                      <input
                        type="number"
                        min="0"
                        max="50000000"
                        step="1000"
                        value={priceRange.max}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(50000000, Number(e.target.value) || 0));
                          handlePriceRangeChange(priceRange.min, value);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                  
                  {/* Price Display */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-md border border-gray-200">
                      Min: {priceRange.min.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1 rounded-md border border-gray-200">
                      Max: {priceRange.max.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Sliders */}
                  <div className="relative space-y-3">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="50000000"
                        step="1000"
                        value={priceRange.min}
                        onChange={(e) => handlePriceRangeChange(Number(e.target.value), priceRange.max)}
                        className="w-full h-3 bg-gradient-to-r from-teal-200 to-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600 hover:accent-teal-700 transition-all"
                        style={{
                          background: `linear-gradient(to right, rgb(20, 184, 166) 0%, rgb(20, 184, 166) ${(priceRange.min / 50000000) * 100}%, rgb(229, 231, 235) ${(priceRange.min / 50000000) * 100}%, rgb(229, 231, 235) 100%)`
                        }}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="50000000"
                        step="1000"
                        value={priceRange.max}
                        onChange={(e) => handlePriceRangeChange(priceRange.min, Number(e.target.value))}
                        className="w-full h-3 bg-gradient-to-r from-gray-200 to-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600 hover:accent-teal-700 transition-all"
                        style={{
                          background: `linear-gradient(to right, rgb(229, 231, 235) 0%, rgb(229, 231, 235) ${(priceRange.max / 50000000) * 100}%, rgb(20, 184, 166) ${(priceRange.max / 50000000) * 100}%, rgb(20, 184, 166) 100%)`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Filter Presets */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Quick Filters</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setPriceRange({ min: 0, max: 50000 });
                    dispatch(setFilters({ minPrice: 0, maxPrice: 50000 }));
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-gray-200 hover:border-teal-300 transition-all"
                >
                  Under MWK 50,000
                </button>
                <button
                  onClick={() => {
                    setPriceRange({ min: 50000, max: 200000 });
                    dispatch(setFilters({ minPrice: 50000, maxPrice: 200000 }));
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-gray-200 hover:border-teal-300 transition-all"
                >
                  MWK 50,000 - 200,000
                </button>
                <button
                  onClick={() => {
                    setPriceRange({ min: 200000, max: 50000000 });
                    dispatch(setFilters({ minPrice: 200000, maxPrice: 50000000 }));
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-gray-200 hover:border-teal-300 transition-all"
                >
                  Above MWK 200,000
                </button>
              </div>
            </div>

            {/* Enhanced Apply Filters Button */}
            <Button
              variant="primary"
              size="default"
              className="w-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              onClick={handleApplyFilters}
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            </div>
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

          {/* Enhanced Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Active filters:</span>
              {filters.category && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 rounded-full text-sm font-medium shadow-sm border border-teal-200">
                  <Package className="h-3 w-3" />
                  {filters.category}
                  <button
                    onClick={() => handleCategoryChange('')}
                    className="hover:text-teal-900 hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.minPrice !== undefined && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 rounded-full text-sm font-medium shadow-sm border border-teal-200">
                  <Settings className="h-3 w-3" />
                  Min: MWK {filters.minPrice.toLocaleString()}
                  <button
                    onClick={() => dispatch(setFilters({ minPrice: undefined }))}
                    className="hover:text-teal-900 hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.maxPrice !== undefined && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 rounded-full text-sm font-medium shadow-sm border border-teal-200">
                  <Settings className="h-3 w-3" />
                  Max: MWK {filters.maxPrice.toLocaleString()}
                  <button
                    onClick={() => dispatch(setFilters({ maxPrice: undefined }))}
                    className="hover:text-teal-900 hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.stockStatus && filters.stockStatus !== 'all' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 rounded-full text-sm font-medium shadow-sm border border-teal-200">
                  <Package className="h-3 w-3" />
                  Stock: {filters.stockStatus.replace('-', ' ')}
                  <button
                    onClick={() => dispatch(setFilters({ stockStatus: undefined }))}
                    className="hover:text-teal-900 hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="ml-auto px-4 py-2 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-white rounded-full border border-gray-300 hover:border-teal-300 transition-all"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Enhanced Products Grid Header with Sort and View Toggle */}
          {!isLoading && !error && data?.products && data.products.length > 0 && (
            <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-teal-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all cursor-pointer"
                  onChange={(e) => {
                    const sortValue = e.target.value;
                    if (sortValue === 'price-asc') {
                      dispatch(setFilters({ sortBy: 'price', sortOrder: 'asc' }));
                    } else if (sortValue === 'price-desc') {
                      dispatch(setFilters({ sortBy: 'price', sortOrder: 'desc' }));
                    } else if (sortValue === 'name-asc') {
                      dispatch(setFilters({ sortBy: 'name', sortOrder: 'asc' }));
                    } else {
                      dispatch(setFilters({ sortBy: undefined, sortOrder: undefined }));
                    }
                  }}
                >
                  <option value="">Default</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Results Per Page */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Show:</span>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-teal-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all cursor-pointer"
                    value={pagination.limit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value, 10);
                      dispatch(setPagination({ limit: newLimit, page: 1 }));
                    }}
                  >
                    <option value="12">12</option>
                    <option value="24">24</option>
                    <option value="48">48</option>
                    <option value="96">96</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
                
                {/* View Toggle */}
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => dispatch(setViewMode('grid'))}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => dispatch(setViewMode('list'))}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="List view"
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {Array.from({ length: pagination.limit }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {Array.from({ length: pagination.limit }).map((_, index) => (
                  <ProductCardListSkeleton key={index} />
                ))}
              </div>
            )
          ) : error ? (
            <div className="text-center py-20 bg-red-50 rounded-lg border-2 border-red-200">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <Body className="text-red-600 text-lg font-semibold mb-2">Error loading products</Body>
              <Body className="text-red-500">Please try again later</Body>
            </div>
          ) : !data?.products || data.products.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-gray-200">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <Body className="text-gray-700 text-lg font-semibold mb-2">No products found</Body>
              <Body className="text-gray-600 mb-4">Try adjusting your filters or search terms</Body>
              <Button
                variant="secondary"
                onClick={handleResetFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {data.products.map((product, index) => (
                    <div
                      key={product._id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ProductCard 
                      product={product} 
                      onQuickView={(product) => setQuickViewProduct(product)}
                    />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  {data.products.map((product, index) => (
                    <div
                      key={product._id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ProductCardList product={product} />
                    </div>
                  ))}
                </div>
              )}

              {/* Advanced Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex flex-col items-center gap-4">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={handlePageChange}
                    maxVisiblePages={7}
                  />
                  <span className="text-sm text-gray-600">
                    Showing {startItem}-{endItem} of {totalItems} products
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      
      {/* Mobile Filter Drawer */}
      <FilterDrawer isOpen={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}>
          <div className="space-y-6">
          {/* Category Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Category</h3>
            </div>
            <div className="space-y-2">
              {categoriesData?.categories && Array.isArray(categoriesData.categories) && categoriesData.categories.length > 0 ? (
                categoriesData.categories.map((cat: { name: string; count: number } | string) => {
                  const categoryName = typeof cat === 'string' ? cat : cat.name;
                  const isSelected = filters.category === categoryName;
                  return (
                    <button
                      key={categoryName}
                      onClick={() => {
                        handleCategoryChange(categoryName);
                        setMobileFilterOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-2 border-teal-300 shadow-md'
                          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? 'bg-teal-200' : 'bg-gray-100'}`}>
                        {getCategoryIcon(categoryName)}
                      </div>
                      <span className="flex-1 text-left">{categoryName}</span>
                      {typeof cat !== 'string' && cat.count > 0 && (
                        <span className={`text-xs ${isSelected ? 'text-teal-600' : 'text-gray-500'}`}>
                          ({cat.count})
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 py-2">Loading categories...</div>
              )}
            </div>
          </div>

          {/* Stock Status */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Stock Status</h3>
            </div>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All', icon: Package },
                { value: 'in-stock', label: 'In Stock', icon: CheckCircle },
                { value: 'low-stock', label: 'Low Stock', icon: AlertCircle },
                { value: 'out-of-stock', label: 'Out of Stock', icon: X },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = (filters.stockStatus || 'all') === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      dispatch(setFilters({ stockStatus: option.value as any }));
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-2 border-teal-300 shadow-md'
                        : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                    <span className="flex-1 text-left">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Price Range</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min</label>
                <input
                  type="number"
                  min="0"
                  max="50000000"
                  value={priceRange.min}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(50000000, Number(e.target.value) || 0));
                    handlePriceRangeChange(value, priceRange.max);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max</label>
                <input
                  type="number"
                  min="0"
                  max="50000000"
                  value={priceRange.max}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(50000000, Number(e.target.value) || 0));
                    handlePriceRangeChange(priceRange.min, value);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <Button
              variant="primary"
              size="default"
              className="w-full"
              onClick={() => {
                handleApplyFilters();
                setMobileFilterOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </FilterDrawer>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
      
      {/* Product Comparison Bar */}
      <ProductComparison />
    </div>
  );
};
