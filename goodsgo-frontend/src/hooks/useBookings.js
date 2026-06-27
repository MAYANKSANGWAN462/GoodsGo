import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  createBooking,
  getBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  withdrawBooking,
  cancelBooking,
  markInProgress,
  completeBooking,
  disputeBooking,
  getBookingHistory,
} from '../services/bookings.service';

/**
 * React Query hook for the authenticated user's bookings list.
 * @param {{ role?: string, status?: string, page?: number, limit?: number }} filters
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useBookings(filters = {}) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => getBookings(filters),
  });
}

/**
 * React Query hook for a single booking by ID.
 * @param {string|undefined} bookingId
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useBooking(bookingId) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBookingById(bookingId),
    enabled: Boolean(bookingId),
  });
}

/**
 * React Query hook for booking status history.
 * @param {string|undefined} bookingId
 * @returns {import('@tanstack/react-query').UseQueryResult<Array>}
 */
export function useBookingHistory(bookingId) {
  return useQuery({
    queryKey: ['booking-history', bookingId],
    queryFn: () => getBookingHistory(bookingId),
    enabled: Boolean(bookingId),
  });
}

/**
 * Mutation hook to create a new booking request.
 * On success: invalidates ['bookings'] and shows toast.
 * Pass additional callbacks via mutate(body, { onSuccess }) at the call site.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => createBooking(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking request sent!');
    },
    onError: (err) => toast.error(err.message || 'Failed to send booking request.'),
  });
}

/**
 * Mutation hook to accept a booking (post owner only).
 * On success: invalidates ['booking', id], ['bookings'], ['conversations'].
 * @param {string} bookingId
 */
export function useAcceptBooking(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => acceptBooking(bookingId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Booking accepted!');
    },
    onError: (err) => toast.error(err.message || 'Failed to accept booking.'),
  });
}

/**
 * Mutation hook to reject a booking (post owner only).
 * @param {string} bookingId
 */
export function useRejectBooking(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => rejectBooking(bookingId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking rejected.');
    },
    onError: (err) => toast.error(err.message || 'Failed to reject booking.'),
  });
}

/**
 * Mutation hook to withdraw a pending booking (requester only).
 * @param {string} bookingId
 */
export function useWithdrawBooking(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking request withdrawn.');
    },
    onError: (err) => toast.error(err.message || 'Failed to withdraw booking.'),
  });
}

/**
 * Mutation hook to cancel a booking (either party).
 * On success: invalidates booking, bookings list, conversations.
 * @param {string} bookingId
 */
export function useCancelBooking(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => cancelBooking(bookingId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Booking cancelled.');
    },
    onError: (err) => toast.error(err.message || 'Failed to cancel booking.'),
  });
}

/**
 * Mutation hook to mark a booking as in-progress (post owner only).
 * @param {string} bookingId
 */
export function useMarkInProgress(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markInProgress(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking marked as in progress.');
    },
    onError: (err) => toast.error(err.message || 'Failed to update booking.'),
  });
}

/**
 * Mutation hook to complete a booking (post owner only).
 * @param {string} bookingId
 */
export function useCompleteBooking(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking marked as completed!');
    },
    onError: (err) => toast.error(err.message || 'Failed to complete booking.'),
  });
}

/**
 * Mutation hook to file a dispute on a booking (either party).
 * @param {string} bookingId
 */
export function useDisputeBooking(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => disputeBooking(bookingId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Dispute filed. Our team will review it.');
    },
    onError: (err) => toast.error(err.message || 'Failed to file dispute.'),
  });
}
