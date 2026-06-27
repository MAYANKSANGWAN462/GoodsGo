import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMe, useUpdateProfile, useChangePassword, useUploadAvatar, useRemoveAvatar, useDeactivateAccount } from '../../hooks/useUsers';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';

// ── Yup schemas (mirror backend Joi constraints) ─────────────────────────────

const profileSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less')
    .required('Full name is required'),
  phone: yup
    .string()
    .matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number', excludeEmptyString: true })
    .nullable()
    .optional(),
  bio: yup
    .string()
    .max(500, 'Bio must be 500 characters or less')
    .nullable()
    .optional(),
  city: yup.string().max(100).nullable().optional(),
  state: yup.string().max(100).nullable().optional(),
  country: yup.string().max(100).nullable().optional(),
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
    .required('Please confirm your new password'),
});

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
};

// ── Profile information form ─────────────────────────────────────────────────

const userShape = PropTypes.shape({
  fullName: PropTypes.string,
  phone: PropTypes.string,
  bio: PropTypes.string,
  city: PropTypes.string,
  state: PropTypes.string,
  country: PropTypes.string,
  profileImageUrl: PropTypes.string,
});

function ProfileForm({ user }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      bio: '',
      city: '',
      state: '',
      country: '',
    },
  });

  const mutation = useUpdateProfile();

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName ?? '',
        phone: user.phone ?? '',
        bio: user.bio ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        country: user.country ?? '',
      });
    }
  }, [user, reset]);

  function onSubmit(values) {
    // Strip null/empty optional fields before sending
    const body = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    mutation.mutate(body);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        id="fullName"
        label="Full name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <Input
        id="phone"
        label="Phone number"
        type="tel"
        error={errors.phone?.message}
        helperText="Optional. Include country code (e.g. +91...)"
        {...register('phone')}
      />
      <Textarea
        id="bio"
        label="Bio"
        rows={3}
        error={errors.bio?.message}
        helperText="Up to 500 characters"
        {...register('bio')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input id="city" label="City" error={errors.city?.message} {...register('city')} />
        <Input id="state" label="State" error={errors.state?.message} {...register('state')} />
        <Input id="country" label="Country" error={errors.country?.message} {...register('country')} />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={mutation.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

ProfileForm.propTypes = { user: userShape };

// ── Change password form ─────────────────────────────────────────────────────

function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(passwordSchema) });

  const mutation = useChangePassword();

  function onSubmit(values) {
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onError: (err) => {
          // Surface API errors inline when they reference the current password field
          if (err?.code === 'INVALID_CREDENTIALS' || err?.status === 401) {
            setError('currentPassword', { message: 'Incorrect current password.' });
          }
        },
        onSuccess: () => reset(),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        id="currentPassword"
        label="Current password"
        type="password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <Input
        id="newPassword"
        label="New password"
        type="password"
        error={errors.newPassword?.message}
        helperText="Minimum 8 characters"
        {...register('newPassword')}
      />
      <Input
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <p className="text-xs text-text-muted">
        Changing your password will log you out of all devices.
      </p>
      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={mutation.isPending}>
          Change password
        </Button>
      </div>
    </form>
  );
}

// ── Avatar section ───────────────────────────────────────────────────────────

function AvatarSection({ user }) {
  const fileInputRef = useRef(null);
  const uploadMutation = useUploadAvatar();
  const removeMutation = useRemoveAvatar();

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    uploadMutation.mutate(formData);
    // Reset so the same file can be re-selected after removal
    e.target.value = '';
  }

  const isWorking = uploadMutation.isPending || removeMutation.isPending;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <Avatar src={user?.profileImageUrl} name={user?.fullName ?? ''} size="xl" />
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Upload avatar"
          onChange={handleFileChange}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          isLoading={uploadMutation.isPending}
          disabled={isWorking}
        >
          Upload new photo
        </Button>
        {user?.profileImageUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMutation.mutate()}
            isLoading={removeMutation.isPending}
            disabled={isWorking}
          >
            Remove photo
          </Button>
        )}
        <p className="text-xs text-text-muted">JPEG, PNG or WebP · Max 5 MB</p>
      </div>
    </div>
  );
}

AvatarSection.propTypes = { user: userShape };

// ── Main SettingsPage ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: user, isLoading } = useMe();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const deactivateMutation = useDeactivateAccount();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-text">Account Settings</h1>

      {/* Profile Information */}
      <Section
        title="Profile Information"
        description="Update your name, location, and bio."
      >
        <ProfileForm user={user} />
      </Section>

      {/* Avatar */}
      <Section
        title="Profile Photo"
        description="A photo helps people recognise you on GoodsGo."
      >
        <AvatarSection user={user} />
      </Section>

      {/* Change Password */}
      <Section
        title="Change Password"
        description="Use a strong password you don't use elsewhere."
      >
        <PasswordForm />
      </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-danger">Deactivate account</p>
            <p className="text-xs text-text-muted mt-0.5">
              Your account and all active posts will be deactivated. This cannot be undone.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeactivateDialog(true)}
          >
            Deactivate
          </Button>
        </div>
      </Section>

      {/* Deactivate confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={() => deactivateMutation.mutate()}
        title="Deactivate your account?"
        message="Your account will be deactivated immediately. All your active posts will also be deactivated. You will not be able to log back in. This action cannot be undone."
        confirmLabel="Yes, deactivate"
        confirmVariant="danger"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
