import { useState, useEffect, useMemo } from 'react';
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
import { VehicleFitmentFilter } from '../components/VehicleFitmentFilter';
import {
  buildRequestPartPath,
  emptySelectedVehicle,
  type SelectedVehicle,
} from '../utils/vehicleFitmentFilter';
import { PageHeading, JournalBody, JournalButton, JournalLinkButton, MonoLabel } from '../components/journal';
import { Filter, X, Settings, ChevronRight, Cog, CircleStop, Zap, Wrench, Package, Grid3x3, List, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Car } from 'lucide-react';
import { getVehicleFitmentMatchStrength } from '@shared/utils/productFitmentMatch';
import type { Product } from '../store/api/productApi';
import { cn } from '../utils/cn';

const VEHICLE_STORAGE_KEY = 'autotek.selectedVehicle';

const readStoredVehicle = (): SelectedVehicle => {
  if (typeof window === 'undefined') return emptySelectedVehicle();
  try {
    const raw = localStorage.getItem(VEHICLE_STORAGE_KEY);
    if (!raw) return emptySelectedVehicle();
    const parsed = JSON.parse(raw) as Partial<SelectedVehicle>;
    return {
      ...emptySelectedVehicle(),
      ...parsed,
      includeUniversal: parsed.includeUniversal !== false,
    };
  } catch {
    return emptySelectedVehicle();
  }
};

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

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice || 5000,
    max: filters.maxPrice || 50000000,
  });
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle>(() => readStoredVehicle());

  // Sync URL search params -> Redux (back/forward, external links)
  useEffect(() => {
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const stockStatus = searchParams.get('stockStatus') || undefined;
    const make = searchParams.get('make') || undefined;
    const model = searchParams.get('model') || undefined;
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
    const engine = searchParams.get('engine') || undefined;
    const includeUniversalParam = searchParams.get('includeUniversal');
    const includeUniversal =
      includeUniversalParam === null ? undefined : includeUniversalParam !== 'false';
    const urlPage = searchParams.get('page');
    const urlLimit = searchParams.get('limit');

    const filtersDiffer =
      filters.category !== category ||
      filters.search !== search ||
      filters.minPrice !== minPrice ||
      filters.maxPrice !== maxPrice ||
      filters.stockStatus !== stockStatus ||
      ((make || model) &&
        (filters.make !== make ||
          filters.model !== model ||
          filters.year !== year ||
          filters.engine !== engine ||
          filters.includeUniversal !== includeUniversal));

    if (filtersDiffer) {
      dispatch(
        setFilters({
          category,
          search,
          minPrice,
          maxPrice,
          stockStatus: stockStatus as 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | undefined,
          ...(make || model
            ? {
                make,
                model,
                year: Number.isInteger(year) ? year : undefined,
                engine,
                includeUniversal,
              }
            : {}),
        })
      );
      if (search !== undefined) {
        setSearchTerm(search);
      } else if (filters.search && !search) {
        setSearchTerm('');
      }
    }

    if (make || model) {
      setSelectedVehicle({
        make: make || '',
        model: model || '',
        year: year && Number.isInteger(year) ? String(year) : '',
        engine: engine || '',
        includeUniversal: includeUniversal !== false,
      });
    } else {
      const stored = readStoredVehicle();
      if (stored.make && stored.model) {
        setSelectedVehicle(stored);
        const storedYear = stored.year ? Number(stored.year) : undefined;
        if (
          filters.make !== stored.make ||
          filters.model !== stored.model ||
          filters.year !== (Number.isInteger(storedYear) ? storedYear : undefined) ||
          filters.engine !== (stored.engine || undefined) ||
          filters.includeUniversal !== stored.includeUniversal
        ) {
          dispatch(
            setFilters({
              make: stored.make,
              model: stored.model,
              year: Number.isInteger(storedYear) ? storedYear : undefined,
              engine: stored.engine || undefined,
              includeUniversal: stored.includeUniversal,
            })
          );
        }
      } else if (selectedVehicle.make || selectedVehicle.model) {
        setSelectedVehicle(emptySelectedVehicle());
      }
    }

    const page = urlPage ? Number(urlPage) : 1;
    const limit = urlLimit ? Number(urlLimit) : undefined;

    if (pagination.page !== page) {
      dispatch(setPagination({ page }));
    }
    if (limit !== undefined && pagination.limit !== limit) {
      dispatch(setPagination({ limit }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync Redux filters -> URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
    if (filters.make) params.set('make', filters.make);
    if (filters.model) params.set('model', filters.model);
    if (filters.year !== undefined) params.set('year', filters.year.toString());
    if (filters.engine) params.set('engine', filters.engine);
    if (filters.includeUniversal === false) params.set('includeUniversal', 'false');
    if (pagination.page > 1) params.set('page', pagination.page.toString());
    if (pagination.limit !== 12) params.set('limit', pagination.limit.toString());

    const newParams = params.toString();

    setSearchParams((current) => {
      if (current.toString() === newParams) return current;
      return params;
    }, { replace: true });
  }, [filters, pagination.page, pagination.limit, setSearchParams]);

  useEffect(() => {
    localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(selectedVehicle));
  }, [selectedVehicle]);

  // Pick up a vehicle selection made in another tab, mirroring useCrossTabSync's pattern
  // for auth/cart/comparison — otherwise an already-open Products tab keeps showing a
  // stale vehicle filter until it's navigated away and back.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== VEHICLE_STORAGE_KEY) return;
      setSelectedVehicle(readStoredVehicle());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const vehicleFilterActive = Boolean(filters.make && filters.model);

  const queryArgs = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      category: filters.category,
      search: filters.search,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      status: filters.status,
      stockStatus: filters.stockStatus,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      ...(vehicleFilterActive
        ? {
            make: filters.make,
            model: filters.model,
            year: filters.year,
            engine: filters.engine,
            includeUniversal: filters.includeUniversal !== false,
          }
        : {}),
    }),
    [filters, pagination.page, pagination.limit, vehicleFilterActive]
  );

  const { data, isLoading, error } = useGetProductsQuery(queryArgs, {
    refetchOnMountOrArgChange: true,
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
    setSelectedVehicle(emptySelectedVehicle());
  };

  const handleVehicleChange = (vehicle: SelectedVehicle) => {
    setSelectedVehicle(vehicle);
    const yearNum = vehicle.year ? Number(vehicle.year) : undefined;
    dispatch(
      setFilters({
        make: vehicle.make || undefined,
        model: vehicle.model || undefined,
        year: Number.isInteger(yearNum) ? yearNum : undefined,
        engine: vehicle.engine.trim() || undefined,
        includeUniversal: vehicle.includeUniversal,
      })
    );
  };

  const handleClearVehicle = () => {
    setSelectedVehicle(emptySelectedVehicle());
    dispatch(
      setFilters({
        make: undefined,
        model: undefined,
        year: undefined,
        engine: undefined,
        includeUniversal: undefined,
      })
    );
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPagination({ page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof typeof filters] !== undefined
  );
  const requestPartPath = buildRequestPartPath(selectedVehicle);
  const vehicleQueryForMatch = vehicleFilterActive
    ? {
        make: filters.make,
        model: filters.model,
        year: filters.year,
        engine: filters.engine,
      }
    : null;
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
    return <IconComponent className="h-3.5 w-3.5" />;
  };

  return (
    <div className="w-full bg-journal-bone">
      {/* Hero Section */}
      <section className="border-b border-journal-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          {/* Breadcrumbs */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[12px] font-sans text-journal-muted">
              <li>
                <Link to="/" className="hover:text-journal-teal transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li className="text-journal-ink font-medium">Spare Parts</li>
            </ol>
          </nav>

          <div className="mb-8">
            <MonoLabel className="block mb-3">Catalogue</MonoLabel>
            <PageHeading className="mb-4">Find your auto parts</PageHeading>
            <JournalBody className="max-w-xl mb-6">
              Browse quality spare parts for Malawi and Southern Africa. Filter by your vehicle to
              see parts listed for your make and model.
            </JournalBody>

            <div className="mb-6 border border-journal-hairline bg-white p-4 rounded-journal">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-sans font-semibold text-[14px] text-journal-ink">Can&apos;t find the part you need?</p>
                  <p className="font-sans text-[13px] text-journal-muted">
                    Send a part request and we&apos;ll help source it for you.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <JournalLinkButton to="/request-part">
                    <Package className="h-3.5 w-3.5" />
                    Request a part
                  </JournalLinkButton>
                  <JournalLinkButton to="/my-part-requests" variant="secondary">
                    My part requests
                  </JournalLinkButton>
                </div>
              </div>
            </div>

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
              <JournalButton
                type="submit"
                variant="primary"
                className="absolute right-1.5 top-1/2 transform -translate-y-1/2"
              >
                Search
              </JournalButton>
            </form>
          </div>

          {/* Quick filter chips */}
          {categoriesData?.categories && categoriesData.categories.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] font-sans font-medium text-journal-muted">Quick filters:</span>
              {categoriesData.categories.slice(0, 4).map((cat: { name: string; count: number }) => {
                const categoryName = typeof cat === 'string' ? cat : cat.name;
                if (!categoryName) return null;
                return (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() =>
                      handleCategoryChange(filters.category === categoryName ? '' : categoryName)
                    }
                    className={cn(
                      'inline-flex items-center px-4 py-2 rounded-full text-[12px] font-sans font-semibold transition-colors whitespace-nowrap border',
                      filters.category === categoryName
                        ? 'bg-journal-ink text-journal-bone border-journal-ink'
                        : 'bg-white text-journal-ink border-journal-hairline hover:border-journal-ink'
                    )}
                  >
                    <span>{categoryName}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] font-sans font-medium text-journal-muted">Quick filters:</span>
              <span className="text-[12px] font-sans text-journal-faint">Loading categories...</span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white border border-journal-hairline rounded-journal p-5 sticky top-24">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-journal-hairline">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-journal-teal" />
                  <h2 className="text-[14px] font-sans font-bold text-journal-ink">Filters</h2>
                  {hasActiveFilters && (
                    <span className="h-5 w-5 bg-journal-ink text-journal-bone text-[11px] rounded-full flex items-center justify-center font-bold">
                      {Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined).length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[12px] text-journal-teal hover:underline font-sans font-medium"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                    className="lg:hidden p-1 hover:bg-journal-sand rounded-journal transition-colors"
                    aria-label={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
                  >
                    {filtersCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-journal-body" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-journal-body" />
                    )}
                  </button>
                </div>
              </div>

              <div className={filtersCollapsed ? 'hidden lg:block' : ''}>

                <VehicleFitmentFilter
                  value={selectedVehicle}
                  onChange={handleVehicleChange}
                  onClear={handleClearVehicle}
                />

                {/* Category Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-3.5 w-3.5 text-journal-teal" />
                    <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Category</h3>
                  </div>
                  <div className="space-y-1">
                    {categoriesData?.categories && Array.isArray(categoriesData.categories) && categoriesData.categories.length > 0 ? (
                      categoriesData.categories.map((cat: { name: string; count: number } | string) => {
                        const categoryName = typeof cat === 'string' ? cat : cat.name;
                        const isSelected = filters.category === categoryName;
                        return (
                          <button
                            key={categoryName}
                            onClick={() => handleCategoryChange(categoryName)}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-journal text-[13px] font-sans font-medium transition-colors border',
                              isSelected
                                ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                                : 'text-journal-body hover:bg-journal-sand border-transparent'
                            )}
                          >
                            {getCategoryIcon(categoryName)}
                            <span className="flex-1 text-left">{categoryName}</span>
                            {typeof cat !== 'string' && cat.count > 0 && (
                              <span className="text-[11px] text-journal-faint">
                                ({cat.count})
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-[12px] font-sans text-journal-faint py-2">Loading categories...</div>
                    )}
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-journal text-[13px] font-sans font-medium transition-colors border',
                        !filters.category
                          ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                          : 'text-journal-body hover:bg-journal-sand border-transparent'
                      )}
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span className="flex-1 text-left">All categories</span>
                    </button>
                  </div>
                </div>

                {/* Stock Status Filter */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-3.5 w-3.5 text-journal-teal" />
                    <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Stock status</h3>
                  </div>
                  <div className="space-y-1">
                    {[
                      { value: 'all', label: 'All', icon: Package },
                      { value: 'in-stock', label: 'In stock', icon: CheckCircle },
                      { value: 'low-stock', label: 'Low stock', icon: AlertCircle },
                      { value: 'out-of-stock', label: 'Out of stock', icon: X },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isSelected = (filters.stockStatus || 'all') === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => dispatch(setFilters({ stockStatus: option.value as any }))}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-journal text-[13px] font-sans font-medium transition-colors border',
                            isSelected
                              ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                              : 'text-journal-body hover:bg-journal-sand border-transparent'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="flex-1 text-left">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Range Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-3.5 w-3.5 text-journal-teal" />
                    <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Price range (MWK)</h3>
                  </div>
                  <div className="space-y-4 bg-journal-sand rounded-journal p-4">
                    <div>
                      {/* Price Input Fields */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-[11px] font-sans font-medium text-journal-muted mb-1">Min price</label>
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
                            className="w-full px-3 py-2 text-[13px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal bg-white"
                            placeholder="Min"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-sans font-medium text-journal-muted mb-1">Max price</label>
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
                            className="w-full px-3 py-2 text-[13px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal bg-white"
                            placeholder="Max"
                          />
                        </div>
                      </div>

                      {/* Price Display */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[12px] font-sans font-semibold text-journal-body bg-white px-2.5 py-1 rounded-journal border border-journal-hairline">
                          Min: {priceRange.min.toLocaleString()}
                        </span>
                        <span className="text-[12px] font-sans font-semibold text-journal-body bg-white px-2.5 py-1 rounded-journal border border-journal-hairline">
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
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-journal-teal"
                            style={{
                              background: `linear-gradient(to right, rgb(17, 94, 89) 0%, rgb(17, 94, 89) ${(priceRange.min / 50000000) * 100}%, rgb(216, 210, 196) ${(priceRange.min / 50000000) * 100}%, rgb(216, 210, 196) 100%)`
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
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-journal-teal"
                            style={{
                              background: `linear-gradient(to right, rgb(216, 210, 196) 0%, rgb(216, 210, 196) ${(priceRange.max / 50000000) * 100}%, rgb(17, 94, 89) ${(priceRange.max / 50000000) * 100}%, rgb(17, 94, 89) 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Filter Presets */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-3.5 w-3.5 text-journal-teal" />
                    <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Quick filters</h3>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setPriceRange({ min: 0, max: 50000 });
                        dispatch(setFilters({ minPrice: 0, maxPrice: 50000 }));
                      }}
                      className="w-full text-left px-3 py-2 text-[13px] font-sans font-medium text-journal-body bg-journal-sand hover:bg-journal-teal-tint hover:text-journal-teal rounded-journal transition-colors"
                    >
                      Under MWK 50,000
                    </button>
                    <button
                      onClick={() => {
                        setPriceRange({ min: 50000, max: 200000 });
                        dispatch(setFilters({ minPrice: 50000, maxPrice: 200000 }));
                      }}
                      className="w-full text-left px-3 py-2 text-[13px] font-sans font-medium text-journal-body bg-journal-sand hover:bg-journal-teal-tint hover:text-journal-teal rounded-journal transition-colors"
                    >
                      MWK 50,000 - 200,000
                    </button>
                    <button
                      onClick={() => {
                        setPriceRange({ min: 200000, max: 50000000 });
                        dispatch(setFilters({ minPrice: 200000, maxPrice: 50000000 }));
                      }}
                      className="w-full text-left px-3 py-2 text-[13px] font-sans font-medium text-journal-body bg-journal-sand hover:bg-journal-teal-tint hover:text-journal-teal rounded-journal transition-colors"
                    >
                      Above MWK 200,000
                    </button>
                  </div>
                </div>

                {/* Apply Filters Button */}
                <JournalButton
                  variant="primary"
                  className="w-full"
                  onClick={handleApplyFilters}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Apply filters
                </JournalButton>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header with Title and Count */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h1 className="font-journal text-[24px] text-journal-ink">
                {filters.category || 'All Products'}
              </h1>
              {data?.pagination && (
                <JournalBody className="!text-journal-muted">
                  Showing {startItem}-{endItem} of {totalItems} products
                </JournalBody>
              )}
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap mb-6 p-4 bg-white rounded-journal border border-journal-hairline">
                <span className="text-[12px] font-sans font-semibold text-journal-body">Active filters:</span>
                {filters.category && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-journal-teal-tint text-journal-teal rounded-full text-[12px] font-sans font-medium border border-journal-teal-tint-border">
                    {filters.category}
                    <button
                      onClick={() => handleCategoryChange('')}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.minPrice !== undefined && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-journal-teal-tint text-journal-teal rounded-full text-[12px] font-sans font-medium border border-journal-teal-tint-border">
                    Min: MWK {filters.minPrice.toLocaleString()}
                    <button
                      onClick={() => dispatch(setFilters({ minPrice: undefined }))}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.maxPrice !== undefined && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-journal-teal-tint text-journal-teal rounded-full text-[12px] font-sans font-medium border border-journal-teal-tint-border">
                    Max: MWK {filters.maxPrice.toLocaleString()}
                    <button
                      onClick={() => dispatch(setFilters({ maxPrice: undefined }))}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.stockStatus && filters.stockStatus !== 'all' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-journal-teal-tint text-journal-teal rounded-full text-[12px] font-sans font-medium border border-journal-teal-tint-border">
                    Stock: {filters.stockStatus.replace('-', ' ')}
                    <button
                      onClick={() => dispatch(setFilters({ stockStatus: undefined }))}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  className="ml-auto px-3 py-1.5 text-[12px] font-sans font-medium text-journal-body hover:text-journal-teal border border-journal-hairline hover:border-journal-teal-tint-border rounded-full transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Products Grid Header with Sort and View Toggle */}
            {!isLoading && !error && data?.products && data.products.length > 0 && (
              <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-journal border border-journal-hairline flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-sans font-medium text-journal-body">Sort by:</span>
                  <select
                    className="px-3 py-2 border border-journal-input-border rounded-journal text-[13px] font-sans font-medium text-journal-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors cursor-pointer"
                    value={
                      filters.sortBy === 'price' && filters.sortOrder === 'asc'
                        ? 'price-asc'
                        : filters.sortBy === 'price' && filters.sortOrder === 'desc'
                        ? 'price-desc'
                        : filters.sortBy === 'name' && filters.sortOrder === 'asc'
                        ? 'name-asc'
                        : filters.sortBy === 'name' && filters.sortOrder === 'desc'
                        ? 'name-desc'
                        : ''
                    }
                    onChange={(e) => {
                      const sortValue = e.target.value;
                      if (sortValue === 'price-asc') {
                        dispatch(setFilters({ sortBy: 'price', sortOrder: 'asc' }));
                      } else if (sortValue === 'price-desc') {
                        dispatch(setFilters({ sortBy: 'price', sortOrder: 'desc' }));
                      } else if (sortValue === 'name-asc') {
                        dispatch(setFilters({ sortBy: 'name', sortOrder: 'asc' }));
                      } else if (sortValue === 'name-desc') {
                        dispatch(setFilters({ sortBy: 'name', sortOrder: 'desc' }));
                      } else {
                        dispatch(setFilters({ sortBy: undefined, sortOrder: undefined }));
                      }
                    }}
                  >
                    <option value="">Default</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  {/* Results Per Page */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-sans font-medium text-journal-body">Show:</span>
                    <select
                      className="px-2.5 py-2 border border-journal-input-border rounded-journal text-[13px] font-sans font-medium text-journal-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors cursor-pointer"
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
                    <span className="text-[12px] font-sans text-journal-muted">per page</span>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center border border-journal-input-border rounded-journal p-0.5">
                    <button
                      onClick={() => dispatch(setViewMode('grid'))}
                      className={cn(
                        'p-1.5 rounded-journal transition-colors',
                        viewMode === 'grid'
                          ? 'bg-journal-ink text-journal-bone'
                          : 'text-journal-body hover:bg-journal-sand'
                      )}
                      aria-label="Grid view"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => dispatch(setViewMode('list'))}
                      className={cn(
                        'p-1.5 rounded-journal transition-colors',
                        viewMode === 'list'
                          ? 'bg-journal-ink text-journal-bone'
                          : 'text-journal-body hover:bg-journal-sand'
                      )}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
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
              <div className="text-center py-20 bg-journal-danger-bg rounded-journal border border-journal-error-border">
                <X className="h-10 w-10 text-journal-danger-text mx-auto mb-4" />
                <p className="text-journal-danger-text text-[16px] font-sans font-semibold mb-1">Error loading products</p>
                <p className="text-journal-danger-text text-[14px] font-sans">Please try again later</p>
              </div>
            ) : !data?.products || data.products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-journal border border-journal-hairline">
                <Package className="h-12 w-12 text-journal-faint mx-auto mb-4" />
                <p className="text-journal-ink text-[16px] font-sans font-semibold mb-1">
                  {vehicleFilterActive ? 'No parts listed for this vehicle' : 'No products found'}
                </p>
                <p className="text-journal-muted text-[14px] font-sans mb-3">
                  {vehicleFilterActive
                    ? 'We could not find catalog parts matching your vehicle filter. Request the part and we will help source it.'
                    : 'Try adjusting your filters or search terms.'}
                </p>
                {vehicleFilterActive && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-journal-teal-tint border border-journal-teal-tint-border px-4 py-2 mb-6">
                    <Car className="h-3.5 w-3.5 text-journal-teal" />
                    <span className="text-[13px] font-sans text-journal-teal">
                      {[filters.year, filters.make, filters.model, filters.engine]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <JournalButton variant="secondary" onClick={handleResetFilters}>
                    Clear filters
                  </JournalButton>
                  <JournalLinkButton to={requestPartPath}>
                    <Package className="h-3.5 w-3.5" />
                    Request a part
                  </JournalLinkButton>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {data.products.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        fitmentMatch={getVehicleFitmentMatchStrength(product, vehicleQueryForMatch)}
                        onQuickView={(product) => setQuickViewProduct(product)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    {data.products.map((product) => (
                      <ProductCardList
                        key={product._id}
                        product={product}
                        fitmentMatch={getVehicleFitmentMatchStrength(product, vehicleQueryForMatch)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="flex flex-col items-center gap-4">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={data.pagination.totalPages}
                      onPageChange={handlePageChange}
                      maxVisiblePages={7}
                    />
                    <span className="text-[13px] font-sans text-journal-muted">
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
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-3.5 w-3.5 text-journal-teal" />
              <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Category</h3>
            </div>
            <div className="space-y-1">
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
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-journal text-[13px] font-sans font-medium transition-colors border',
                        isSelected
                          ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                          : 'text-journal-body hover:bg-journal-sand border-transparent'
                      )}
                    >
                      {getCategoryIcon(categoryName)}
                      <span className="flex-1 text-left">{categoryName}</span>
                      {typeof cat !== 'string' && cat.count > 0 && (
                        <span className="text-[11px] text-journal-faint">
                          ({cat.count})
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-[12px] font-sans text-journal-faint py-2">Loading categories...</div>
              )}
            </div>
          </div>

          {/* Stock Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-3.5 w-3.5 text-journal-teal" />
              <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Stock status</h3>
            </div>
            <div className="space-y-1">
              {[
                { value: 'all', label: 'All', icon: Package },
                { value: 'in-stock', label: 'In stock', icon: CheckCircle },
                { value: 'low-stock', label: 'Low stock', icon: AlertCircle },
                { value: 'out-of-stock', label: 'Out of stock', icon: X },
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
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-journal text-[13px] font-sans font-medium transition-colors border',
                      isSelected
                        ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                        : 'text-journal-body hover:bg-journal-sand border-transparent'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-3.5 w-3.5 text-journal-teal" />
              <h3 className="text-[11px] font-sans font-bold text-journal-ink uppercase tracking-[0.08em]">Price range</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-sans font-medium text-journal-muted mb-1">Min</label>
                <input
                  type="number"
                  min="0"
                  max="50000000"
                  value={priceRange.min}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(50000000, Number(e.target.value) || 0));
                    handlePriceRangeChange(value, priceRange.max);
                  }}
                  className="w-full px-3 py-2 text-[13px] font-sans border border-journal-input-border rounded-journal"
                />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-medium text-journal-muted mb-1">Max</label>
                <input
                  type="number"
                  min="0"
                  max="50000000"
                  value={priceRange.max}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(50000000, Number(e.target.value) || 0));
                    handlePriceRangeChange(priceRange.min, value);
                  }}
                  className="w-full px-3 py-2 text-[13px] font-sans border border-journal-input-border rounded-journal"
                />
              </div>
            </div>
            <JournalButton
              variant="primary"
              className="w-full"
              onClick={() => {
                handleApplyFilters();
                setMobileFilterOpen(false);
              }}
            >
              Apply filters
            </JournalButton>
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
