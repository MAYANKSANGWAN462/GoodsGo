import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';

import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import Button from '../common/Button';
import { geocodeAddress } from '../../services/location.service';

const MAX_IMAGES = 5;

const schema = yup.object({
  origin_address: yup
    .string()
    .required('From location is required')
    .min(5, 'Enter at least 5 characters'),
  destination_address: yup
    .string()
    .required('To location is required')
    .min(2, 'Enter at least 2 characters'),
  availability_date: yup.string().required('Date is required'),
  vehicle_type: yup.string().required('Vehicle type is required'),
  goods_type: yup
    .string()
    .required('Describe the goods you need transported')
    .max(100, 'Max 100 characters'),
  goods_category: yup.string().required('Goods category is required'),
  goods_weight_kg: yup
    .number()
    .typeError('Enter a valid weight')
    .positive('Must be a positive number')
    .required('Weight is required'),
  budget_min: yup
    .number()
    .typeError('Enter a valid amount')
    .positive('Must be positive')
    .required('Minimum budget is required'),
  budget_max: yup
    .number()
    .typeError('Enter a valid amount')
    .positive('Must be positive')
    .min(yup.ref('budget_min'), 'Max must be ≥ min budget')
    .nullable()
    .optional()
    .transform((val, orig) => (orig === '' ? null : val)),
  description: yup.string().max(1000, 'Max 1000 characters').optional(),
  is_fragile: yup.boolean().optional(),
});

/**
 * Form for creating/editing a need_transport post.
 * @param {{ defaultValues?: object, existingImageUrls?: string[], onSubmit: (fd: FormData) => void, isPending: boolean }} props
 */
export default function NeedTransportForm({
  defaultValues,
  existingImageUrls = [],
  onSubmit,
  isPending,
}) {
  const queryClient = useQueryClient();
  const config = queryClient.getQueryData(['config']);
  const vehicleOptions = (config?.vehicleTypes ?? []).map((v) => ({
    value: v.name,
    label: v.label,
  }));
  const categoryOptions = (config?.goodsCategories ?? []).map((c) => ({
    value: c.name,
    label: c.label,
  }));

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError, setImageError] = useState('');
  const [originCoords, setOriginCoords] = useState({ lat: 0, lng: 0 });
  const [destCoords, setDestCoords] = useState({ lat: null, lng: null });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    const combined = [...imageFiles, ...files].slice(0, MAX_IMAGES);
    if (imageFiles.length + files.length > MAX_IMAGES) {
      setImageError(`Maximum ${MAX_IMAGES} images allowed.`);
    } else {
      setImageError('');
    }
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removeImage = (index) => {
    const next = imageFiles.filter((_, i) => i !== index);
    setImageFiles(next);
    setImagePreviews(next.map((f) => URL.createObjectURL(f)));
    setImageError('');
  };

  const geocodeOrigin = useCallback(async (e) => {
    const addr = e.target.value.trim();
    if (addr.length < 3) return;
    try {
      const result = await geocodeAddress(addr);
      if (result?.lat != null) setOriginCoords({ lat: result.lat, lng: result.lng });
    } catch {
      // Silent — fallback coordinates (0,0) will be used
    }
  }, []);

  const geocodeDest = useCallback(async (e) => {
    const addr = e.target.value.trim();
    if (addr.length < 3) return;
    try {
      const result = await geocodeAddress(addr);
      if (result?.lat != null) setDestCoords({ lat: result.lat, lng: result.lng });
    } catch {
      // Silent
    }
  }, []);

  const buildFormData = (values) => {
    const fd = new FormData();
    fd.append('post_type', 'need_transport');
    fd.append('origin_address', values.origin_address);
    fd.append('origin_city', values.origin_address);
    fd.append('origin_lat', String(originCoords.lat));
    fd.append('origin_lng', String(originCoords.lng));
    fd.append('destination_address', values.destination_address);
    fd.append('destination_city', values.destination_address);
    if (destCoords.lat != null) {
      fd.append('destination_lat', String(destCoords.lat));
      fd.append('destination_lng', String(destCoords.lng));
    }
    fd.append('availability_date', values.availability_date);
    fd.append('vehicle_type', values.vehicle_type);
    fd.append('goods_type', values.goods_type);
    fd.append('goods_category', values.goods_category);
    fd.append('goods_weight_kg', String(values.goods_weight_kg));
    fd.append('budget_min', String(values.budget_min));
    if (values.budget_max) fd.append('budget_max', String(values.budget_max));
    if (values.description) fd.append('description', values.description);
    fd.append('is_fragile', values.is_fragile ? 'true' : 'false');
    imageFiles.forEach((file) => fd.append('images', file));
    return fd;
  };

  const handleFormSubmit = (values) => {
    onSubmit(buildFormData(values));
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6">
      {/* ── Route ─────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Route
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="origin_address"
            label="From (city / area)"
            placeholder="e.g. New Delhi"
            error={errors.origin_address?.message}
            {...register('origin_address', { onBlur: geocodeOrigin })}
          />
          <Input
            id="destination_address"
            label="To (city / area)"
            placeholder="e.g. Mumbai"
            error={errors.destination_address?.message}
            {...register('destination_address', { onBlur: geocodeDest })}
          />
        </div>
      </section>

      {/* ── Schedule ─────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Schedule
        </h3>
        <div className="max-w-xs">
          <Input
            id="availability_date"
            label="Pickup date"
            type="date"
            min={today}
            error={errors.availability_date?.message}
            {...register('availability_date')}
          />
        </div>
      </section>

      {/* ── Goods ────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Goods Details
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="vehicle_type"
            label="Vehicle type needed"
            placeholder="Select vehicle type"
            options={vehicleOptions}
            error={errors.vehicle_type?.message}
            {...register('vehicle_type')}
          />
          <Select
            id="goods_category"
            label="Goods category"
            placeholder="Select category"
            options={categoryOptions}
            error={errors.goods_category?.message}
            {...register('goods_category')}
          />
          <Input
            id="goods_type"
            label="What are you transporting?"
            placeholder="e.g. Furniture, Electronics"
            error={errors.goods_type?.message}
            {...register('goods_type')}
          />
          <Input
            id="goods_weight_kg"
            label="Weight (kg)"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="e.g. 200"
            error={errors.goods_weight_kg?.message}
            {...register('goods_weight_kg')}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            id="is_fragile"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            {...register('is_fragile')}
          />
          <label htmlFor="is_fragile" className="text-sm text-gray-700">
            Goods are fragile — extra care required
          </label>
        </div>
      </section>

      {/* ── Budget ───────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Budget (₹)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="budget_min"
            label="Minimum budget"
            type="number"
            min="1"
            placeholder="e.g. 5000"
            error={errors.budget_min?.message}
            {...register('budget_min')}
          />
          <Input
            id="budget_max"
            label="Maximum budget (optional)"
            type="number"
            min="1"
            placeholder="e.g. 10000"
            error={errors.budget_max?.message}
            {...register('budget_max')}
          />
        </div>
      </section>

      {/* ── Additional info ──────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Additional Information
        </h3>
        <Textarea
          id="description"
          label="Special requirements (optional)"
          placeholder="Any special handling, timing constraints, or additional details..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
      </section>

      {/* ── Images ───────────────────────────────────── */}
      <ImageUploadSection
        existingImageUrls={existingImageUrls}
        imagePreviews={imagePreviews}
        imageError={imageError}
        onFileChange={handleImageChange}
        onRemove={removeImage}
        maxImages={MAX_IMAGES}
        currentCount={imageFiles.length}
      />

      {/* ── Submit ───────────────────────────────────── */}
      <Button type="submit" fullWidth isLoading={isPending}>
        {defaultValues ? 'Update Post' : 'Create Post'}
      </Button>
    </form>
  );
}

NeedTransportForm.propTypes = {
  defaultValues: PropTypes.object,
  existingImageUrls: PropTypes.arrayOf(PropTypes.string),
  onSubmit: PropTypes.func.isRequired,
  isPending: PropTypes.bool.isRequired,
};

// ── Shared image upload section ─────────────────────────────────────────────

function ImageUploadSection({
  existingImageUrls,
  imagePreviews,
  imageError,
  onFileChange,
  onRemove,
  maxImages,
  currentCount,
}) {
  const allPreviews = [
    ...existingImageUrls.map((url) => ({ url, isExisting: true })),
    ...imagePreviews.map((url) => ({ url, isExisting: false })),
  ].slice(0, maxImages);

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Photos (optional — up to {maxImages})
      </h3>
      <div className="flex flex-wrap gap-3 mb-3">
        {allPreviews.map((item, i) => (
          <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={item.url}
              alt={`Preview ${i + 1}`}
              className="h-full w-full object-cover"
            />
            {!item.isExisting && (
              <button
                type="button"
                onClick={() => onRemove(i - existingImageUrls.length)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {currentCount < maxImages && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors">
          <span>+ Add photos</span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            onChange={onFileChange}
          />
        </label>
      )}
      {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
    </section>
  );
}

ImageUploadSection.propTypes = {
  existingImageUrls: PropTypes.arrayOf(PropTypes.string).isRequired,
  imagePreviews: PropTypes.arrayOf(PropTypes.string).isRequired,
  imageError: PropTypes.string.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  maxImages: PropTypes.number.isRequired,
  currentCount: PropTypes.number.isRequired,
};
