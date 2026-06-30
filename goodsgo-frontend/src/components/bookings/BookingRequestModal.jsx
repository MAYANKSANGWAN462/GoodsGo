import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Button from '../common/Button';
import { useCreateBooking } from '../../hooks/useBookings';

const today = new Date().toISOString().split('T')[0];

/**
 * Yup schema for a transporter responding to a Need-Transport post.
 * The cargo, pickup, and drop are already on the post — only offer fields are collected.
 */
const transporterSchema = yup.object({
  scheduledDate: yup.string().required('Estimated pickup date is required'),
  goodsDescription: yup
    .string()
    .min(5, 'Please describe your vehicle and capacity (at least 5 characters)')
    .required('Vehicle details are required'),
  specialInstructions: yup.string(),
});

/**
 * Yup schema for a shipper booking a Vehicle-Available or Return-Journey post.
 * The vehicle, capacity, and route are on the post — only cargo/route fields are collected.
 */
const shipperSchema = yup.object({
  pickupAddress: yup.string().required('Your pickup point is required'),
  destinationAddress: yup.string().required('Your destination is required'),
  goodsDescription: yup
    .string()
    .min(5, 'Please describe your cargo (at least 5 characters)')
    .required('Cargo details are required'),
  specialInstructions: yup.string(),
});

/**
 * Modal form to send a booking request for a specific post.
 * The field set rendered depends on post.postType:
 *   need_transport → transporter offer (vehicle/date/message, no cargo re-entry)
 *   vehicle_available / return_journey → shipper cargo details (route/goods, no vehicle re-entry)
 */
export default function BookingRequestModal({ isOpen, onClose, post }) {
  const isNeedTransport = post?.postType === 'need_transport';
  const schema = isNeedTransport ? transporterSchema : shipperSchema;
  const title = isNeedTransport ? 'Submit Transport Offer' : 'Request Cargo Space';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: yupResolver(schema) });

  // Reset form when post changes or modal closes, so stale values don't persist.
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const createMutation = useCreateBooking();

  function onSubmit(values) {
    createMutation.mutate(
      {
        post_id:              post.id,
        pickup_address:       values.pickupAddress       || undefined,
        destination_address:  values.destinationAddress  || undefined,
        scheduled_date:       values.scheduledDate       || undefined,
        goods_description:    values.goodsDescription,
        special_instructions: values.specialInstructions || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} isLoading={createMutation.isPending}>
            Send Request
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {isNeedTransport ? (
          /* Transporter offer fields — cargo details come from the post, not re-collected here */
          <>
            <p className="text-xs text-text-muted bg-surface-alt rounded-lg px-3 py-2">
              The shipper has already provided cargo details. Describe your vehicle and
              availability below.
            </p>
            <Input
              label="Estimated Pickup Date *"
              id="scheduledDate"
              type="date"
              min={today}
              error={errors.scheduledDate?.message}
              {...register('scheduledDate')}
            />
            <Textarea
              label="Vehicle Details &amp; Capacity *"
              id="goodsDescription"
              rows={3}
              placeholder="e.g. Tata Ace, 750kg capacity, enclosed body — available from Delhi on the requested date."
              error={errors.goodsDescription?.message}
              {...register('goodsDescription')}
            />
            <Textarea
              label="Message to Shipper (optional)"
              id="specialInstructions"
              rows={2}
              placeholder="Any questions or notes for the shipper..."
              error={errors.specialInstructions?.message}
              {...register('specialInstructions')}
            />
          </>
        ) : (
          /* Shipper cargo fields — vehicle/route details come from the post */
          <>
            <p className="text-xs text-text-muted bg-surface-alt rounded-lg px-3 py-2">
              The transporter has already provided vehicle and route details. Describe
              your cargo and pickup/drop points below.
            </p>
            <Input
              label="Your Pickup Point *"
              id="pickupAddress"
              placeholder="e.g. Sector 44, Gurgaon — must be on or near the listed route"
              error={errors.pickupAddress?.message}
              {...register('pickupAddress')}
            />
            <Input
              label="Your Destination *"
              id="destinationAddress"
              placeholder="e.g. Andheri East, Mumbai"
              error={errors.destinationAddress?.message}
              {...register('destinationAddress')}
            />
            <Textarea
              label="Cargo Details *"
              id="goodsDescription"
              rows={3}
              placeholder="Type, weight, dimensions, packaging — e.g. 200kg furniture, wrapped in bubble wrap, no stacking."
              error={errors.goodsDescription?.message}
              {...register('goodsDescription')}
            />
            <Textarea
              label="Special Handling Requirements (optional)"
              id="specialInstructions"
              rows={2}
              placeholder="Fragile, temperature-sensitive, hazardous, etc."
              error={errors.specialInstructions?.message}
              {...register('specialInstructions')}
            />
          </>
        )}
      </form>
    </Modal>
  );
}

BookingRequestModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    postType: PropTypes.string.isRequired,
  }).isRequired,
};
