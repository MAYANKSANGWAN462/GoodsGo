import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
  removeAvatar,
  getPublicProfile,
  deactivateAccount,
} from '../services/users.service';
import useAuth from './useAuth';
import { ROUTES } from '../constants/routes';

/**
 * React Query hook for the authenticated user's full profile.
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 30_000,
  });
}

/**
 * React Query hook for a public user profile by ID.
 * Does not retry on 404 — suspended/deleted users return 404 by design.
 * @param {string} userId
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function usePublicProfile(userId) {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => getPublicProfile(userId),
    enabled: Boolean(userId),
    retry: (failureCount, error) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

/**
 * Mutation hook to update the authenticated user's profile.
 * On success: invalidates ['me'] and shows success toast.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => updateProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated successfully.');
    },
    onError: (err) => toast.error(err.message || 'Failed to update profile.'),
  });
}

/**
 * Mutation hook to change the authenticated user's password.
 * Backend revokes all sessions — on success, logs out and redirects to /login.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useChangePassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body) => changePassword(body),
    onSuccess: async () => {
      toast.success('Password changed. Please log in again.');
      await logout();
      navigate(ROUTES.LOGIN);
    },
    onError: (err) => toast.error(err.message || 'Failed to change password.'),
  });
}

/**
 * Mutation hook to upload a new avatar image.
 * On success: invalidates ['me'].
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => uploadAvatar(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Avatar updated.');
    },
    onError: (err) => toast.error(err.message || 'Failed to upload avatar.'),
  });
}

/**
 * Mutation hook to remove the current avatar image.
 * On success: invalidates ['me'].
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useRemoveAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Avatar removed.');
    },
    onError: (err) => toast.error(err.message || 'Failed to remove avatar.'),
  });
}

/**
 * Mutation hook to permanently deactivate the authenticated user's account.
 * On success: clears auth state and redirects to home.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useDeactivateAccount() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: deactivateAccount,
    onSuccess: async () => {
      await logout();
      navigate(ROUTES.HOME);
      toast.success('Your account has been deactivated.');
    },
    onError: (err) => toast.error(err.message || 'Failed to deactivate account.'),
  });
}
