import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PropTypes from 'prop-types';
import { useCreateReview } from '../../hooks/useReviews';
import StarRating from '../common/StarRating';
import Textarea from '../common/Textarea';
import Button from '../common/Button';

const ROLE_DISPLAY = {
  as_customer: 'Customer',
  as_transporter: 'Transporter',
};

const schema = yup.object({
  rating: yup
    .number()
    .typeError('Rating is required')
    .required('Rating is required')
    .min(1, 'Please select at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comment: yup
    .string()
    .required('Comment is required')
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment cannot exceed 1000 characters'),
});

/**
 * Create-review form shown on BookingDetailPage after a booking is completed.
 * reviewRole is derived from the booking (requester → as_customer; owner → as_transporter)
 * and passed as a prop — it is not user-selectable.
 *
 * @param {{ bookingId: string, revieweeId: string, reviewRole: 'as_customer'|'as_transporter', onSuccess?: function }} props
 */
export default function ReviewForm({ bookingId, revieweeId, reviewRole, onSuccess }) {
  const { mutate: createReview, isPending } = useCreateReview();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { rating: 0, comment: '' },
  });

  function onSubmit(data) {
    createReview(
      { bookingId, rating: data.rating, comment: data.comment, reviewRole, revieweeId },
      { onSuccess: () => onSuccess?.() }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {reviewRole && (
        <p className="text-xs text-text-muted">
          Reviewing as:{' '}
          <span className="font-medium text-text">
            {ROLE_DISPLAY[reviewRole] ?? reviewRole}
          </span>
        </p>
      )}

      {/* Star rating — uses Controller since StarRating is not a native input */}
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          Rating <span className="text-danger">*</span>
        </label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <StarRating value={field.value} onChange={field.onChange} size="lg" />
          )}
        />
        {errors.rating && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {errors.rating.message}
          </p>
        )}
      </div>

      <Textarea
        id="review-comment"
        label="Comment *"
        rows={4}
        error={errors.comment?.message}
        {...register('comment')}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Submit Review
      </Button>
    </form>
  );
}

ReviewForm.propTypes = {
  bookingId: PropTypes.string.isRequired,
  revieweeId: PropTypes.string,
  reviewRole: PropTypes.oneOf(['as_customer', 'as_transporter']).isRequired,
  onSuccess: PropTypes.func,
};
