import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { initiatePayment, verifyPayment } from '../services/payments.service';

/**
 * Mutation hook to initiate a Razorpay payment order for an accepted booking.
 * Returns order details needed to open the Razorpay checkout modal.
 * The caller's onSuccess receives { data: { orderId, amount, currency, key, paymentRowId } }.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useInitiatePayment() {
  return useMutation({
    mutationFn: (bookingId) => initiatePayment(bookingId),
    onError: (err) => toast.error(err.message || 'Failed to initiate payment. Please try again.'),
  });
}

/**
 * Mutation hook to verify a Razorpay payment after the checkout modal succeeds.
 * On success: invalidates ['booking', bookingId] so the detail page refreshes.
 * Variables must include { bookingId, orderId, paymentId, signature }.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) => verifyPayment(variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      toast.success('Payment verified successfully!');
    },
    onError: (err) =>
      toast.error(err.message || 'Payment verification failed. Please contact support.'),
  });
}
