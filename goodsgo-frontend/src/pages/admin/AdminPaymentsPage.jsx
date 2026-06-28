import { useState } from 'react';
import { useReleasePayment, useRefundPayment } from '../../hooks/useAdmin';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

const releaseSchema = yup.object({
  bookingId: yup.string().uuid('Must be a valid booking UUID').required('Booking ID is required'),
});

const refundSchema = yup.object({
  bookingId: yup.string().uuid('Must be a valid booking UUID').required('Booking ID is required'),
  amount:    yup.number().positive('Amount must be positive').required('Amount is required'),
  reason:    yup.string().min(5, 'Reason must be at least 5 characters').required('Reason is required'),
});

function ReleaseForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: yupResolver(releaseSchema) });

  const mutation = useReleasePayment();

  function onSubmit({ bookingId }) {
    mutation.mutate(bookingId, {
      onSuccess: () => { reset(); toast.success('Payment released to transporter.'); },
    });
  }

  return (
    <Card padding="md">
      <h2 className="text-base font-semibold text-text mb-1">Release Payment</h2>
      <p className="text-sm text-text-muted mb-4">
        Manually release an escrowed payment to the transporter when the booking is completed
        and funds are held pending release.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Input
          id="releaseBookingId"
          label="Booking ID (UUID)"
          placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
          error={errors.bookingId?.message}
          {...register('bookingId')}
        />
        <Button type="submit" variant="primary" isLoading={mutation.isPending}>
          Release Payment
        </Button>
      </form>
    </Card>
  );
}

function RefundForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: yupResolver(refundSchema) });

  const mutation = useRefundPayment();

  function onSubmit({ bookingId, amount, reason }) {
    mutation.mutate(
      { bookingId, body: { amount: Number(amount), reason } },
      { onSuccess: () => { reset(); toast.success('Payment refunded to customer.'); } }
    );
  }

  return (
    <Card padding="md">
      <h2 className="text-base font-semibold text-text mb-1">Refund Payment</h2>
      <p className="text-sm text-text-muted mb-4">
        Issue a refund to the customer. Use this after a dispute is resolved in the
        customer's favour or when a payment was collected in error.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Input
          id="refundBookingId"
          label="Booking ID (UUID)"
          placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
          error={errors.bookingId?.message}
          {...register('bookingId')}
        />
        <Input
          id="refundAmount"
          label="Refund amount (₹)"
          type="number"
          placeholder="e.g. 2500"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Input
          id="refundReason"
          label="Reason"
          placeholder="e.g. Dispute resolved in customer's favour"
          error={errors.reason?.message}
          {...register('reason')}
        />
        <Button type="submit" variant="danger" isLoading={mutation.isPending}>
          Issue Refund
        </Button>
      </form>
    </Card>
  );
}

export default function AdminPaymentsPage() {
  const [activeAction, setActiveAction] = useState('release');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text mb-2">Payment Actions</h1>
      <p className="text-sm text-text-muted mb-6">
        Manually release or refund payments for completed or disputed bookings.
        These actions require the booking ID from the relevant booking detail page.
      </p>

      {/* Action tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[
          { key: 'release', label: 'Release Payment' },
          { key: 'refund',  label: 'Issue Refund' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveAction(key)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeAction === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {activeAction === 'release' && <ReleaseForm />}
      {activeAction === 'refund'  && <RefundForm />}

      <div className="mt-6 p-4 bg-amber-50 border border-warning rounded-lg">
        <p className="text-sm text-warning font-medium">Note</p>
        <p className="text-sm text-text-muted mt-1">
          No admin payment list endpoint exists in the backend. Payment actions require
          a specific booking ID. To add a payment list view, add{' '}
          <code className="bg-amber-100 px-1 rounded">GET /admin/payments</code> to the backend.
        </p>
      </div>
    </div>
  );
}
