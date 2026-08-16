import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { UserRole } from '@shared/types';
import { useAppDispatch, useAppSelector } from '../store/types';
import { useGetCategoriesQuery, useGetProductSuggestionsQuery } from '../store/api/productApi';
import {
  useCreateCustomOrderMutation,
  type BodyStyle,
  type Drivetrain,
  type PartPosition,
  type PartPreference,
  type Transmission,
} from '../store/api/customOrderApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Breadcrumb } from '../components/Breadcrumb';
import { CatalogSuggestionsPanel } from '../components/CatalogSuggestionsPanel';
import {
  JournalCard,
  JournalButton,
  JournalInput,
  JournalSelect,
  JournalTextarea,
  PageHeading,
  SectionHeading,
  JournalBody,
} from '../components/journal';
import {
  OTHER_VEHICLE_VALUE,
  VEHICLE_MAKES,
  getModelsForMake,
} from '../constants/vehicleOptions';

const OTHER_CATEGORY_VALUE = '__other__';
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const POSITION_OPTIONS: { value: PartPosition; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'rear', label: 'Rear' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'front-left', label: 'Front left' },
  { value: 'front-right', label: 'Front right' },
  { value: 'rear-left', label: 'Rear left' },
  { value: 'rear-right', label: 'Rear right' },
  { value: 'inner', label: 'Inner' },
  { value: 'outer', label: 'Outer' },
  { value: 'driver', label: 'Driver side' },
  { value: 'passenger', label: 'Passenger side' },
  { value: 'not-applicable', label: 'Not applicable' },
];

const TRANSMISSION_OPTIONS: { value: Transmission; label: string }[] = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
  { value: 'cvt', label: 'CVT' },
  { value: 'not-sure', label: 'Not sure' },
];

const DRIVETRAIN_OPTIONS: { value: Drivetrain; label: string }[] = [
  { value: 'fwd', label: 'FWD' },
  { value: 'rwd', label: 'RWD' },
  { value: 'awd-4wd', label: 'AWD / 4WD' },
  { value: 'not-sure', label: 'Not sure' },
];

const BODY_STYLE_OPTIONS: { value: BodyStyle; label: string }[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'wagon', label: 'Wagon' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'suv', label: 'SUV' },
  { value: 'other', label: 'Other' },
  { value: 'not-sure', label: 'Not sure' },
];

const PREFERENCE_OPTIONS: { value: PartPreference; label: string }[] = [
  { value: 'genuine-oem', label: 'Genuine / OEM' },
  { value: 'new-aftermarket', label: 'New aftermarket' },
  { value: 'used-reconditioned', label: 'Used / reconditioned' },
  { value: 'no-preference', label: 'No preference' },
];

export const RequestPart = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const [createCustomOrder, { isLoading }] = useCreateCustomOrderMutation();

  const categoryOptions = useMemo(() => {
    const categories = categoriesData?.categories ?? [];
    return categories
      .map((category) => (typeof category === 'string' ? category : category.name))
      .filter(Boolean);
  }, [categoriesData]);

  const [showMoreVehicleDetails, setShowMoreVehicleDetails] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const make = params.get('make') || '';
    const model = params.get('model') || '';
    const year = params.get('year') || '';
    const engine = params.get('engine') || '';
    const knownMake = (VEHICLE_MAKES as readonly string[]).includes(make);
    const modelsForMake = knownMake ? getModelsForMake(make) : [];
    const knownModel = modelsForMake.includes(model);

    return {
      productName: '',
      category: '',
      otherCategory: '',
      description: '',
      estimatedPrice: '',
      make: knownMake ? make : make ? OTHER_VEHICLE_VALUE : '',
      otherMake: knownMake ? '' : make,
      model: knownMake && knownModel ? model : model ? OTHER_VEHICLE_VALUE : '',
      otherModel: knownMake && knownModel ? '' : model,
      year,
      engine,
      trim: '',
      transmission: '' as Transmission | '',
      drivetrain: '' as Drivetrain | '',
      bodyStyle: '' as BodyStyle | '',
      vinOrChassis: '',
      position: '' as PartPosition | '',
      partNumber: '',
      quantity: '1',
      preference: 'no-preference' as PartPreference,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dismissSuggestions, setDismissSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState({
    make: '',
    model: '',
    year: undefined as number | undefined,
    engine: '',
    productName: '',
    partNumber: '',
    category: '',
  });

  const modelOptions = useMemo(() => getModelsForMake(formData.make), [formData.make]);

  const resolvedCategory =
    formData.category === OTHER_CATEGORY_VALUE ? formData.otherCategory.trim() : formData.category.trim();
  const resolvedMake =
    formData.make === OTHER_VEHICLE_VALUE ? formData.otherMake.trim() : formData.make.trim();
  const resolvedModel =
    formData.model === OTHER_VEHICLE_VALUE ? formData.otherModel.trim() : formData.model.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const yearNum = Number(formData.year);
      setSuggestionQuery({
        make: resolvedMake,
        model: resolvedModel,
        year: Number.isInteger(yearNum) ? yearNum : undefined,
        engine: formData.engine.trim(),
        productName: formData.productName.trim(),
        partNumber: formData.partNumber.trim(),
        category: resolvedCategory,
      });
      setDismissSuggestions(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    formData.engine,
    formData.partNumber,
    formData.productName,
    formData.year,
    resolvedCategory,
    resolvedMake,
    resolvedModel,
  ]);

  const canSuggest =
    Boolean(suggestionQuery.make && suggestionQuery.model) &&
    (suggestionQuery.productName.length >= 3 || suggestionQuery.partNumber.length >= 3);

  const { data: suggestionData, isFetching: isFetchingSuggestions } = useGetProductSuggestionsQuery(
    {
      make: suggestionQuery.make,
      model: suggestionQuery.model,
      year: suggestionQuery.year,
      engine: suggestionQuery.engine || undefined,
      productName: suggestionQuery.productName || undefined,
      partNumber: suggestionQuery.partNumber || undefined,
      category: suggestionQuery.category || undefined,
      limit: 5,
    },
    { skip: !canSuggest }
  );

  useEffect(() => {
    if (!user) {
      navigate('/login?returnUrl=/request-part', { replace: true });
      return;
    }

    if (user.role === UserRole.ADMIN) {
      dispatch(
        showNotification({
          message: 'Admin accounts cannot create customer part requests',
          type: 'error',
        })
      );
      navigate('/admin/dashboard', { replace: true });
    }
  }, [dispatch, navigate, user]);

  const updateField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleMakeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      make: value,
      otherMake: value === OTHER_VEHICLE_VALUE ? prev.otherMake : '',
      model: value === OTHER_VEHICLE_VALUE ? OTHER_VEHICLE_VALUE : '',
      otherModel: value === OTHER_VEHICLE_VALUE ? prev.otherModel : '',
    }));
    setErrors((prev) => ({ ...prev, make: '', otherMake: '', model: '', otherModel: '' }));
  };

  const handleModelChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      model: value,
      otherModel: value === OTHER_VEHICLE_VALUE ? prev.otherModel : '',
    }));
    setErrors((prev) => ({ ...prev, model: '', otherModel: '' }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (images.length + selected.length > MAX_IMAGES) {
      dispatch(
        showNotification({
          message: `Maximum ${MAX_IMAGES} images allowed`,
          type: 'error',
        })
      );
      e.target.value = '';
      return;
    }

    const invalidType = selected.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (invalidType) {
      dispatch(
        showNotification({
          message: 'Only JPEG, PNG, WebP, and GIF images are allowed',
          type: 'error',
        })
      );
      e.target.value = '';
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_IMAGE_BYTES);
    if (oversized) {
      dispatch(
        showNotification({
          message: 'Each image must be 10 MB or smaller',
          type: 'error',
        })
      );
      e.target.value = '';
      return;
    }

    const nextImages = [...images, ...selected];
    setImages(nextImages);

    const nextPreviews: string[] = [];
    nextImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        nextPreviews.push(reader.result as string);
        if (nextPreviews.length === nextImages.length) {
          setImagePreviews(nextPreviews);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const currentYear = new Date().getFullYear() + 1;

    if (!formData.productName.trim()) nextErrors.productName = 'Part name is required';
    if (!formData.category) nextErrors.category = 'Category is required';
    else if (formData.category === OTHER_CATEGORY_VALUE && !formData.otherCategory.trim()) {
      nextErrors.otherCategory = 'Enter a category for this part';
    }
    if (!formData.make) nextErrors.make = 'Vehicle make is required';
    else if (formData.make === OTHER_VEHICLE_VALUE && !formData.otherMake.trim()) {
      nextErrors.otherMake = 'Enter the vehicle make';
    }
    if (!formData.model) nextErrors.model = 'Vehicle model is required';
    else if (formData.model === OTHER_VEHICLE_VALUE && !formData.otherModel.trim()) {
      nextErrors.otherModel = 'Enter the vehicle model';
    }
    if (!formData.year.trim()) nextErrors.year = 'Vehicle year is required';
    else {
      const year = Number(formData.year);
      if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
        nextErrors.year = `Year must be between 1900 and ${currentYear}`;
      }
    }
    if (!formData.engine.trim()) nextErrors.engine = 'Engine size or engine code is required';
    if (!formData.position) nextErrors.position = 'Part position is required';
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      nextErrors.description = 'Please provide at least 10 characters of detail';
    }

    const quantity = Number(formData.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      nextErrors.quantity = 'Quantity must be a whole number between 1 and 100';
    }

    if (formData.estimatedPrice.trim()) {
      const parsed = Number(formData.estimatedPrice);
      if (Number.isNaN(parsed) || parsed < 0) {
        nextErrors.estimatedPrice = 'Estimated budget must be a valid amount';
      }
    }

    if (formData.vinOrChassis.trim()) {
      const vin = formData.vinOrChassis.trim();
      if (vin.length < 5 || vin.length > 32 || !/^[A-Za-z0-9-]+$/.test(vin)) {
        nextErrors.vinOrChassis = 'Enter a valid VIN or chassis/frame number';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    try {
      await createCustomOrder({
        productName: formData.productName.trim(),
        category: resolvedCategory,
        description: formData.description.trim(),
        make: resolvedMake,
        model: resolvedModel,
        year: Number(formData.year),
        engine: formData.engine.trim(),
        position: formData.position as PartPosition,
        quantity: Number(formData.quantity),
        trim: formData.trim.trim() || undefined,
        transmission: formData.transmission || undefined,
        drivetrain: formData.drivetrain || undefined,
        bodyStyle: formData.bodyStyle || undefined,
        vinOrChassis: formData.vinOrChassis.trim() || undefined,
        partNumber: formData.partNumber.trim() || undefined,
        preference: formData.preference,
        estimatedPrice: formData.estimatedPrice.trim() ? Number(formData.estimatedPrice) : undefined,
        images: images.length > 0 ? images : undefined,
      }).unwrap();

      dispatch(
        showNotification({
          message: 'Part request submitted successfully',
          type: 'success',
        })
      );
      navigate('/my-part-requests');
    } catch (error) {
      const errorInfo = getErrorInfo(error, 'Failed to submit part request. Please try again.');
      dispatch(
        showNotification({
          message: errorInfo.message,
          type: 'error',
        })
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          { label: 'Request a Part' },
        ]}
      />

      <div className="mt-6">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 text-[13px] font-sans font-medium text-journal-muted hover:text-journal-ink transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to products
        </button>

        <PageHeading className="!text-[28px] sm:!text-[32px] mb-2">Request a part</PageHeading>
        <JournalBody className="!text-journal-muted mb-8">
          Can&apos;t find it in our catalogue? Tell us your vehicle and part details so we can source the
          correct spare.
        </JournalBody>

        <JournalCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <SectionHeading className="!text-[20px] mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-journal-teal" />
                Vehicle details
              </SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JournalSelect
                  label="Make *"
                  value={formData.make}
                  onChange={(e) => handleMakeChange(e.target.value)}
                  error={errors.make}
                  required
                >
                  <option value="">Select make</option>
                  {VEHICLE_MAKES.map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
                  <option value={OTHER_VEHICLE_VALUE}>Other</option>
                </JournalSelect>

                {formData.make === OTHER_VEHICLE_VALUE ? (
                  <JournalInput
                    label="Other make"
                    value={formData.otherMake}
                    onChange={(e) => updateField('otherMake', e.target.value)}
                    placeholder="e.g., Datsun"
                    required
                    error={errors.otherMake}
                  />
                ) : (
                  <JournalSelect
                    label="Model *"
                    value={formData.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    error={errors.model}
                    required
                    disabled={!formData.make}
                  >
                    <option value="">{formData.make ? 'Select model' : 'Select make first'}</option>
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                    {formData.make && <option value={OTHER_VEHICLE_VALUE}>Other</option>}
                  </JournalSelect>
                )}

                {formData.make === OTHER_VEHICLE_VALUE && (
                  <JournalInput
                    label="Model"
                    value={formData.otherModel}
                    onChange={(e) => updateField('otherModel', e.target.value)}
                    placeholder="e.g., Go+"
                    required
                    error={errors.otherModel}
                  />
                )}

                {formData.make !== OTHER_VEHICLE_VALUE && formData.model === OTHER_VEHICLE_VALUE && (
                  <div className="md:col-span-2">
                    <JournalInput
                      label="Other model"
                      value={formData.otherModel}
                      onChange={(e) => updateField('otherModel', e.target.value)}
                      placeholder="e.g., Mark X"
                      required
                      error={errors.otherModel}
                    />
                  </div>
                )}

                <JournalInput
                  label="Year *"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => updateField('year', e.target.value)}
                  placeholder="e.g., 2015"
                  required
                  error={errors.year}
                />
                <JournalInput
                  label="Engine size or engine code *"
                  value={formData.engine}
                  onChange={(e) => updateField('engine', e.target.value)}
                  placeholder="e.g., 1.5L or 1NZ-FE"
                  required
                  error={errors.engine}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowMoreVehicleDetails((prev) => !prev)}
                className="mt-4 inline-flex items-center gap-2 text-[13px] font-sans font-medium text-journal-teal hover:text-journal-deep-teal transition-colors"
              >
                {showMoreVehicleDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                More vehicle details
              </button>

              {showMoreVehicleDetails && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <JournalInput
                    label="Trim / variant (optional)"
                    value={formData.trim}
                    onChange={(e) => updateField('trim', e.target.value)}
                    placeholder="e.g., XLi, GLX"
                  />
                  <JournalSelect
                    label="Transmission"
                    value={formData.transmission}
                    onChange={(e) => updateField('transmission', e.target.value as Transmission | '')}
                  >
                    <option value="">Select transmission</option>
                    {TRANSMISSION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </JournalSelect>
                  <JournalSelect
                    label="Drivetrain"
                    value={formData.drivetrain}
                    onChange={(e) => updateField('drivetrain', e.target.value as Drivetrain | '')}
                  >
                    <option value="">Select drivetrain</option>
                    {DRIVETRAIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </JournalSelect>
                  <JournalSelect
                    label="Body style"
                    value={formData.bodyStyle}
                    onChange={(e) => updateField('bodyStyle', e.target.value as BodyStyle | '')}
                  >
                    <option value="">Select body style</option>
                    {BODY_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </JournalSelect>
                  <div className="md:col-span-2">
                    <JournalInput
                      label="VIN or chassis/frame number (optional)"
                      value={formData.vinOrChassis}
                      onChange={(e) => updateField('vinOrChassis', e.target.value)}
                      placeholder="17-character VIN or Japanese frame number"
                      error={errors.vinOrChassis}
                    />
                    <JournalBody className="!text-xs !text-journal-muted mt-1.5">
                      Helps us confirm the exact vehicle. Visible only to you and AutoTek staff.
                    </JournalBody>
                  </div>
                </div>
              )}
            </div>

            <div>
              <SectionHeading className="!text-[20px] mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-journal-teal" />
                Part details
              </SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JournalInput
                  label="Part name *"
                  value={formData.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                  placeholder="e.g., Front brake pads"
                  required
                  error={errors.productName}
                />

                <JournalSelect
                  label="Category *"
                  value={formData.category}
                  onChange={(e) => {
                    updateField('category', e.target.value);
                    if (e.target.value !== OTHER_CATEGORY_VALUE) {
                      updateField('otherCategory', '');
                    }
                  }}
                  error={errors.category}
                  required
                  disabled={isLoadingCategories}
                >
                  <option value="">{isLoadingCategories ? 'Loading categories...' : 'Select a category'}</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value={OTHER_CATEGORY_VALUE}>Other</option>
                </JournalSelect>

                {formData.category === OTHER_CATEGORY_VALUE && (
                  <div className="md:col-span-2">
                    <JournalInput
                      label="Other category"
                      value={formData.otherCategory}
                      onChange={(e) => updateField('otherCategory', e.target.value)}
                      placeholder="e.g., Body Parts"
                      required
                      error={errors.otherCategory}
                    />
                  </div>
                )}

                <JournalSelect
                  label="Part position *"
                  value={formData.position}
                  onChange={(e) => updateField('position', e.target.value as PartPosition | '')}
                  error={errors.position}
                  required
                >
                  <option value="">Select position</option>
                  {POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </JournalSelect>

                <JournalInput
                  label="Quantity *"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  required
                  error={errors.quantity}
                />

                <JournalInput
                  label="OEM / part number (optional)"
                  value={formData.partNumber}
                  onChange={(e) => updateField('partNumber', e.target.value)}
                  placeholder="Printed on the old part or packaging"
                />

                <JournalSelect
                  label="Part preference"
                  value={formData.preference}
                  onChange={(e) => updateField('preference', e.target.value as PartPreference)}
                >
                  {PREFERENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </JournalSelect>

                <JournalInput
                  label="Estimated budget in MWK (optional)"
                  type="number"
                  min="0"
                  value={formData.estimatedPrice}
                  onChange={(e) => updateField('estimatedPrice', e.target.value)}
                  placeholder="e.g., 85000"
                  error={errors.estimatedPrice}
                />
              </div>
            </div>

            <div>
              <SectionHeading className="!text-[20px] mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-journal-teal" />
                Supporting information
              </SectionHeading>

              <div className="space-y-4">
                <JournalTextarea
                  label="Description *"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Symptoms, measurements, or anything else that helps us identify the correct part."
                  rows={5}
                  error={errors.description}
                  required
                />

                <div>
                  <label className="block font-sans font-semibold text-[11px] tracking-[0.10em] uppercase text-journal-muted mb-1.5">
                    Photos (optional, max {MAX_IMAGES})
                  </label>
                  <JournalBody className="!text-sm !text-journal-muted mb-3 flex items-start gap-2">
                    <Camera className="h-4 w-4 text-journal-teal mt-0.5 shrink-0" />
                    Photograph the old part, any printed part number/label, and where it installs on the vehicle.
                  </JournalBody>
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={images.length >= MAX_IMAGES || isLoading}
                    />
                    <div className="flex items-center justify-center px-4 py-3 border border-dashed border-journal-input-border rounded-journal hover:border-journal-teal transition-colors cursor-pointer">
                      <Upload className="h-4 w-4 text-journal-faint mr-2" />
                      <JournalBody className="!text-journal-muted">
                        {images.length > 0
                          ? `${images.length} of ${MAX_IMAGES} photo(s) selected`
                          : `Choose images (max ${MAX_IMAGES}, 10 MB each)`}
                      </JournalBody>
                    </div>
                  </label>
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={`${preview}-${index}`} className="relative">
                          <img
                            src={preview}
                            alt={`Part request preview ${index + 1}`}
                            className="w-full h-36 object-contain rounded-journal border border-journal-hairline bg-journal-sand p-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-journal-danger-text text-white rounded-full p-1 hover:opacity-90"
                            aria-label={`Remove photo ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canSuggest && (
              <CatalogSuggestionsPanel
                suggestions={suggestionData?.suggestions || []}
                isLoading={isFetchingSuggestions}
                dismissed={dismissSuggestions}
                onDismiss={() => setDismissSuggestions(true)}
                subtitle="If one of these is correct, open it and order from the catalog instead of submitting a request. Suggestions are not guaranteed fits."
              />
            )}

            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-journal-danger-bg border border-journal-error-border rounded-journal flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-journal-danger-text flex-shrink-0 mt-0.5" />
                <div>
                  <JournalBody className="!text-journal-danger-text font-semibold mb-1">
                    Please fix the highlighted fields.
                  </JournalBody>
                  <JournalBody className="!text-sm !text-journal-danger-text">
                    Accurate vehicle and part details help us source the correct spare the first time.
                  </JournalBody>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <JournalButton type="submit" variant="primary" className="flex-1 gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit part request
                  </>
                )}
              </JournalButton>
              <JournalButton
                type="button"
                variant="secondary"
                onClick={() => navigate('/products')}
                disabled={isLoading}
              >
                Cancel
              </JournalButton>
            </div>
          </form>
        </JournalCard>

        <JournalCard className="mt-6 !bg-journal-teal-tint !border-journal-teal">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-white rounded-journal border border-journal-teal flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-journal-teal" />
            </div>
            <div>
              <JournalBody className="font-semibold !text-journal-ink mb-1">What happens next?</JournalBody>
              <JournalBody className="!text-sm !text-journal-body">
                Our team reviews your vehicle and part details, confirms availability, and updates you in My
                Part Requests.
              </JournalBody>
            </div>
          </div>
        </JournalCard>
      </div>
    </div>
  );
};
