import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';

import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Select from '../common/Select';
import Button from '../common/Button';
import LocationAutocomplete from '../location/LocationAutocomplete';

const MAX_IMAGES = 5;

const schema = yup.object({
  origin_address: yup
    .string()
    .required('From location is required')
    .min(5, 'Enter at least 5 characters'),
  destination_address: yup.string().max(500).optional(),
  availability_date: yup.string().required('Date is required'),
  vehicle_type: yup.string().required('Vehicle type is required'),
  vehicle_capacity_kg: yup
    .number()
    .typeError('Enter a valid capacity')
    .positive('Must be a positive number')
    .required('Vehicle capacity is required'),
  price_expectation: yup
    .number()
    .typeError('Enter a valid amount')
    .positive('Must be positive')
    .nullable()
    .optional()
    .transform((val, orig) => (orig === '' ? null : val)),
  description: yup.string().max(1000, 'Max 1000 characters').optional(),
});

/**
 * Form for creating/editing a vehicle_available post.
 * @param {{ defaultValues?: object, existingImageUrls?: string[], onSubmit: (fd: FormData) => void, isPending: boolean }} props
 */
export default function VehicleAvailableForm({
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

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError, setImageError] = useState('');
  const [originCoords, setOriginCoords] = useState({ lat: 0, lng: 0 });
  const [destCoords, setDestCoords] = useState({ lat: null, lng: null });

  const {
    register,
    control,
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

  const buildFormData = (values) => {
    const fd = new FormData();
    fd.append('post_type', 'vehicle_available');
    fd.append('origin_address', values.origin_address);
    fd.append('origin_city', values.origin_address);
    fd.append('origin_lat', String(originCoords.lat));
    fd.append('origin_lng', String(originCoords.lng));
    if (values.destination_address) {
      fd.append('destination_address', values.destination_address);
      fd.append('destination_city', values.destination_address);
      if (destCoords.lat != null) {
        fd.append('destination_lat', String(destCoords.lat));
        fd.append('destination_lng', String(destCoords.lng));
      }
    }
    fd.append('availability_date', values.availability_date);
    fd.append('vehicle_type', values.vehicle_type);
    fd.append('vehicle_capacity_kg', String(values.vehicle_capacity_kg));
    if (values.price_expectation) {
      fd.append('price_expectation', String(values.price_expectation));
    }
    if (values.description) fd.append('description', values.description);
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
          <Controller
            name="origin_address"
            control={control}
            render={({ field, fieldState }) => (
              <LocationAutocomplete
                id="va_origin"
                label="Departing from"
                placeholder="e.g. New Delhi"
                value={field.value ?? ''}
                onChange={field.onChange}
                onSelect={(displayName, coords) => {
                  field.onChange(displayName);
                  setOriginCoords(coords);
                }}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="destination_address"
            control={control}
            render={({ field, fieldState }) => (
              <LocationAutocomplete
                id="va_destination"
                label="Heading towards (optional)"
                placeholder="e.g. Mumbai"
                value={field.value ?? ''}
                onChange={field.onChange}
                onSelect={(displayName, coords) => {
                  field.onChange(displayName);
                  setDestCoords(coords);
                }}
                error={fieldState.error?.message}
              />
            )}
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
            id="va_date"
            label="Available date"
            type="date"
            min={today}
            error={errors.availability_date?.message}
            {...register('availability_date')}
          />
        </div>
      </section>

      {/* ── Vehicle ───────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Vehicle Details
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            id="va_vehicle_type"
            label="Vehicle type"
            placeholder="Select vehicle type"
            options={vehicleOptions}
            error={errors.vehicle_type?.message}
            {...register('vehicle_type')}
          />
          <Input
            id="va_capacity"
            label="Capacity (kg)"
            type="number"
            min="1"
            step="0.5"
            placeholder="e.g. 1000"
            error={errors.vehicle_capacity_kg?.message}
            {...register('vehicle_capacity_kg')}
          />
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Pricing
        </h3>
        <div className="max-w-xs">
          <Input
            id="va_price"
            label="Expected price per trip ₹ (optional)"
            type="number"
            min="1"
            placeholder="e.g. 8000"
            error={errors.price_expectation?.message}
            {...register('price_expectation')}
          />
        </div>
      </section>

      {/* ── Additional info ───────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Additional Information
        </h3>
        <Textarea
          id="va_description"
          label="Description (optional)"
          placeholder="Any additional details about your vehicle, availability, or restrictions..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
      </section>

      {/* ── Images ─────────────────────────────────────── */}
      <ImageUploadSection
        existingImageUrls={existingImageUrls}
        imagePreviews={imagePreviews}
        imageError={imageError}
        onFileChange={handleImageChange}
        onRemove={removeImage}
        maxImages={MAX_IMAGES}
        currentCount={imageFiles.length}
      />

      {/* ── Submit ─────────────────────────────────────── */}
      <Button type="submit" fullWidth isLoading={isPending}>
        {defaultValues ? 'Update Post' : 'Create Post'}
      </Button>
    </form>
  );
}

VehicleAvailableForm.propTypes = {
  defaultValues: PropTypes.object,
  existingImageUrls: PropTypes.arrayOf(PropTypes.string),
  onSubmit: PropTypes.func.isRequired,
  isPending: PropTypes.bool.isRequired,
};

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
            <img src={item.url} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
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
          <input type="file" multiple accept="image/*" className="sr-only" onChange={onFileChange} />
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
