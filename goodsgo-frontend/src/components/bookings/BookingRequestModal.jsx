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

const schema = yup.object({
  pickupAddress: yup.string().required('Pickup address is required'),
  destinationAddress: yup.string().required('Destination address is required'),
  scheduledDate: yup
    .string()
    .required('Scheduled date is required'),
  goodsDescription: yup
    .string()
    .min(5, 'Please describe the goods (at least 5 characters)')
    .required('Goods description is required'),
  specialInstructions: yup.string(),
});

/**
 * Modal form to send a booking request for a specific post.
 * Triggered from PostDetailPage via the "Request Booking" button.
 */
export default function BookingRequestModal({ isOpen, onClose, postId }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: yupResolver(schema) });

  const createMutation = useCreateBooking();

  function onSubmit(values) {
    createMutation.mutate(
      {
        postId,
        pickupAddress: values.pickupAddress,
        destinationAddress: values.destinationAddress,
        scheduledDate: values.scheduledDate,
        goodsDescription: values.goodsDescription,
        specialInstructions: values.specialInstructions || undefined,
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
      title="Request Booking"
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
        <Input
          label="Pickup Address *"
          id="pickupAddress"
          placeholder="e.g. 123 Main St, Delhi"
          error={errors.pickupAddress?.message}
          {...register('pickupAddress')}
        />
        <Input
          label="Destination Address *"
          id="destinationAddress"
          placeholder="e.g. 456 Park Ave, Mumbai"
          error={errors.destinationAddress?.message}
          {...register('destinationAddress')}
        />
        <Input
          label="Scheduled Date *"
          id="scheduledDate"
          type="date"
          min={today}
          error={errors.scheduledDate?.message}
          {...register('scheduledDate')}
        />
        <Textarea
          label="Goods Description *"
          id="goodsDescription"
          rows={3}
          placeholder="Describe what needs to be transported..."
          error={errors.goodsDescription?.message}
          {...register('goodsDescription')}
        />
        <Textarea
          label="Special Instructions (optional)"
          id="specialInstructions"
          rows={2}
          placeholder="Any special handling requirements, fragile items, etc."
          error={errors.specialInstructions?.message}
          {...register('specialInstructions')}
        />
      </form>
    </Modal>
  );
}

BookingRequestModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  postId: PropTypes.string.isRequired,
};
