import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getAdminUsers,
  getAdminUser,
  suspendUser,
  reactivateUser,
  getAdminPosts,
  hidePost,
  restorePost,
  getAdminReports,
  resolveReport,
  dismissReport,
  getAdminDisputes,
  resolveDispute,
  releasePayment,
  refundPayment,
  getAdminSettings,
} from '../services/admin.service';

// ── User Management ─────────────────────────────────────────────────────────

export function useAdminUsers(filters = {}) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => getAdminUsers(filters),
    staleTime: 30_000,
  });
}

export function useAdminUser(userId) {
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => getAdminUser(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }) => suspendUser(userId, reason),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      toast.success('User suspended successfully.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => reactivateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      toast.success('User reactivated successfully.');
    },
    onError: (err) => toast.error(err.message),
  });
}

// ── Post Moderation ─────────────────────────────────────────────────────────

export function useAdminPosts(filters = {}) {
  return useQuery({
    queryKey: ['admin-posts', filters],
    queryFn: () => getAdminPosts(filters),
    staleTime: 30_000,
  });
}

export function useHidePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId) => hidePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post hidden successfully.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useRestorePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId) => restorePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success('Post restored successfully.');
    },
    onError: (err) => toast.error(err.message),
  });
}

// ── Report Management ───────────────────────────────────────────────────────

export function useAdminReports(filters = {}) {
  return useQuery({
    queryKey: ['admin-reports', filters],
    queryFn: () => getAdminReports(filters),
    staleTime: 30_000,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, body }) => resolveReport(reportId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Report resolved.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, body }) => dismissReport(reportId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Report dismissed.');
    },
    onError: (err) => toast.error(err.message),
  });
}

// ── Dispute Management ──────────────────────────────────────────────────────

export function useAdminDisputes(filters = {}) {
  return useQuery({
    queryKey: ['admin-disputes', filters],
    queryFn: () => getAdminDisputes(filters),
    staleTime: 30_000,
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ disputeId, body }) => resolveDispute(disputeId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      toast.success('Dispute resolved.');
    },
    onError: (err) => toast.error(err.message),
  });
}

// ── Payment Actions ─────────────────────────────────────────────────────────

export function useReleasePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId) => releasePayment(bookingId),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success('Payment released to transporter.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, body }) => refundPayment(bookingId, body),
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success('Payment refunded to customer.');
    },
    onError: (err) => toast.error(err.message),
  });
}

// ── Platform Settings ───────────────────────────────────────────────────────

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: getAdminSettings,
    staleTime: 60_000,
  });
}
