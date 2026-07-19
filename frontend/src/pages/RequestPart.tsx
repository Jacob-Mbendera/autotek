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
import { useGetCategoriesQuery } from '../store/api/productApi';
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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
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

const selectClassName = (hasError?: boolean) =>
  `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
    hasError ? 'border-red-500' : 'border-gray-300'
  }`;

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
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    otherCategory: '',
    description: '',
    estimatedPrice: '',
    make: '',
    otherMake: '',
    model: '',
    otherModel: '',
    year: '',
    engine: '',
    trim: '',
    transmission: '' as Transmission | '',
    drivetrain: '' as Drivetrain | '',
    bodyStyle: '' as BodyStyle | '',
    vinOrChassis: '',
    position: '' as PartPosition | '',
    partNumber: '',
    quantity: '1',
    preference: 'no-preference' as PartPreference,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modelOptions = useMemo(() => getModelsForMake(formData.make), [formData.make]);

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

  const resolvedCategory =
    formData.category === OTHER_CATEGORY_VALUE ? formData.otherCategory.trim() : formData.category.trim();
  const resolvedMake =
    formData.make === OTHER_VEHICLE_VALUE ? formData.otherMake.trim() : formData.make.trim();
  const resolvedModel =
    formData.model === OTHER_VEHICLE_VALUE ? formData.otherModel.trim() : formData.model.trim();

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

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="small" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>

        <H1 className="text-3xl font-bold text-gray-900 mb-2">Request a Part</H1>
        <Body className="text-gray-600 mb-8">
          Can&apos;t find it in our catalog? Tell us your vehicle and part details so we can source the
          correct spare.
        </Body>

        <Card variant="lg">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-teal-600" />
                Vehicle Details
              </H2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.make}
                    onChange={(e) => handleMakeChange(e.target.value)}
                    className={selectClassName(Boolean(errors.make))}
                    required
                  >
                    <option value="">Select make</option>
                    {VEHICLE_MAKES.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                    <option value={OTHER_VEHICLE_VALUE}>Other</option>
                  </select>
                  {errors.make && <p className="mt-1 text-sm text-red-600">{errors.make}</p>}
                </div>

                {formData.make === OTHER_VEHICLE_VALUE ? (
                  <Input
                    label="Other make"
                    value={formData.otherMake}
                    onChange={(e) => updateField('otherMake', e.target.value)}
                    placeholder="e.g., Datsun"
                    required
                    error={errors.otherMake}
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.model}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className={selectClassName(Boolean(errors.model))}
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
                    </select>
                    {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model}</p>}
                  </div>
                )}

                {formData.make === OTHER_VEHICLE_VALUE && (
                  <Input
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
                    <Input
                      label="Other model"
                      value={formData.otherModel}
                      onChange={(e) => updateField('otherModel', e.target.value)}
                      placeholder="e.g., Mark X"
                      required
                      error={errors.otherModel}
                    />
                  </div>
                )}

                <Input
                  label="Year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => updateField('year', e.target.value)}
                  placeholder="e.g., 2015"
                  required
                  error={errors.year}
                />
                <Input
                  label="Engine size or engine code"
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
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
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
                  <Input
                    label="Trim / variant (optional)"
                    value={formData.trim}
                    onChange={(e) => updateField('trim', e.target.value)}
                    placeholder="e.g., XLi, GLX"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                    <select
                      value={formData.transmission}
                      onChange={(e) => updateField('transmission', e.target.value as Transmission | '')}
                      className={selectClassName()}
                    >
                      <option value="">Select transmission</option>
                      {TRANSMISSION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Drivetrain</label>
                    <select
                      value={formData.drivetrain}
                      onChange={(e) => updateField('drivetrain', e.target.value as Drivetrain | '')}
                      className={selectClassName()}
                    >
                      <option value="">Select drivetrain</option>
                      {DRIVETRAIN_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Body style</label>
                    <select
                      value={formData.bodyStyle}
                      onChange={(e) => updateField('bodyStyle', e.target.value as BodyStyle | '')}
                      className={selectClassName()}
                    >
                      <option value="">Select body style</option>
                      {BODY_STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="VIN or chassis/frame number (optional)"
                      value={formData.vinOrChassis}
                      onChange={(e) => updateField('vinOrChassis', e.target.value)}
                      placeholder="17-character VIN or Japanese frame number"
                      error={errors.vinOrChassis}
                    />
                    <Body className="text-xs text-gray-500 mt-1">
                      Helps us confirm the exact vehicle. Visible only to you and AutoTek staff.
                    </Body>
                  </div>
                </div>
              )}
            </div>

            <div>
              <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-600" />
                Part Details
              </H2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Part name"
                  value={formData.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                  placeholder="e.g., Front brake pads"
                  required
                  error={errors.productName}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      updateField('category', e.target.value);
                      if (e.target.value !== OTHER_CATEGORY_VALUE) {
                        updateField('otherCategory', '');
                      }
                    }}
                    className={selectClassName(Boolean(errors.category))}
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
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                {formData.category === OTHER_CATEGORY_VALUE && (
                  <div className="md:col-span-2">
                    <Input
                      label="Other category"
                      value={formData.otherCategory}
                      onChange={(e) => updateField('otherCategory', e.target.value)}
                      placeholder="e.g., Body Parts"
                      required
                      error={errors.otherCategory}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Part position <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => updateField('position', e.target.value as PartPosition | '')}
                    className={selectClassName(Boolean(errors.position))}
                    required
                  >
                    <option value="">Select position</option>
                    {POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position}</p>}
                </div>

                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  required
                  error={errors.quantity}
                />

                <Input
                  label="OEM / part number (optional)"
                  value={formData.partNumber}
                  onChange={(e) => updateField('partNumber', e.target.value)}
                  placeholder="Printed on the old part or packaging"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Part preference</label>
                  <select
                    value={formData.preference}
                    onChange={(e) => updateField('preference', e.target.value as PartPreference)}
                    className={selectClassName()}
                  >
                    {PREFERENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
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
              <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-teal-600" />
                Supporting Information
              </H2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Symptoms, measurements, or anything else that helps us identify the correct part."
                    rows={5}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos (optional, max {MAX_IMAGES})
                  </label>
                  <Body className="text-sm text-gray-600 mb-3 flex items-start gap-2">
                    <Camera className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                    Photograph the old part, any printed part number/label, and where it installs on the vehicle.
                  </Body>
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={images.length >= MAX_IMAGES || isLoading}
                    />
                    <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 transition-colors cursor-pointer">
                      <Upload className="h-5 w-5 text-gray-400 mr-2" />
                      <Body className="text-gray-600">
                        {images.length > 0
                          ? `${images.length} of ${MAX_IMAGES} photo(s) selected`
                          : `Choose images (max ${MAX_IMAGES}, 10 MB each)`}
                      </Body>
                    </div>
                  </label>
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={`${preview}-${index}`} className="relative">
                          <img
                            src={preview}
                            alt={`Part request preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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

            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Body className="font-semibold text-red-900 mb-1">Please fix the highlighted fields.</Body>
                  <Body className="text-sm text-red-700">
                    Accurate vehicle and part details help us source the correct spare the first time.
                  </Body>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="default"
                className="flex-1 gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Submit Part Request
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/products')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        <Card variant="md" className="mt-6 bg-teal-50 border-teal-200">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <Body className="font-semibold text-gray-900 mb-1">What happens next?</Body>
              <Body className="text-sm text-gray-700">
                Our team reviews your vehicle and part details, confirms availability, and updates you in My
                Part Requests.
              </Body>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
