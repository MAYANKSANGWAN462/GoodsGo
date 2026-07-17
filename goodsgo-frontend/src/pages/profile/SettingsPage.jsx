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
import ProfileBackground from '../../components/profile/ProfileBackground';

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

function Section({ title, description, icon, danger, children }) {
  return (
    <div className={`bg-surface border rounded-xl shadow-sm overflow-hidden ${danger ? 'border-danger/30' : 'border-border'}`}>
      {/* Section header */}
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${danger ? 'border-danger/20 bg-danger-subtle' : 'border-border bg-surface-alt'}`}>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className={`text-sm font-semibold ${danger ? 'text-danger' : 'text-text'}`}>{title}</h2>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.node,
  danger: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

// ── Icons ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

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
    const { fullName, ...rest } = values;
    const raw = { ...(fullName !== undefined ? { full_name: fullName } : {}), ...rest };
    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== '' && v !== null && v !== undefined)
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
    e.target.value = '';
  }

  const isWorking = uploadMutation.isPending || removeMutation.isPending;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative flex-shrink-0">
        <Avatar src={user?.profileImageUrl} name={user?.fullName ?? ''} size="xl" />
        {isWorking && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        )}
      </div>
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
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Avatar section skeleton */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-alt">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton h-4 w-32 rounded-full" />
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="skeleton w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-8 w-28 rounded-lg" />
              <div className="skeleton h-3 w-40 rounded-full" />
            </div>
          </div>
        </div>
        {/* Profile form skeleton */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-alt">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton h-4 w-28 rounded-full" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-3.5 w-20 rounded-full" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            ))}
            <div className="skeleton h-10 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Background: fixed to the full viewport below the sticky navbar (h-14 = 3.5rem).
          pointer-events-none so it never intercepts clicks. */}
      <div
        className="fixed left-0 right-0 bottom-0 overflow-hidden pointer-events-none"
        style={{ top: '3.5rem', zIndex: 1 }}
      >
        <ProfileBackground />
      </div>

      {/* Settings content — elevated above the fixed background */}
      <div className="relative max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in" style={{ zIndex: 2 }}>
      {/* Page header — frosted card so title text reads against the night scene */}
      <div className="flex items-center gap-3 mb-2 bg-surface/80 backdrop-blur-sm rounded-xl px-4 py-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-text">Account Settings</h1>
          <p className="text-text-muted text-sm">Manage your profile and security settings</p>
        </div>
      </div>

      {/* Profile Information */}
      <Section
        title="Profile Information"
        description="Update your name, location, and bio."
        icon={<IconUser />}
      >
        <ProfileForm user={user} />
      </Section>

      {/* Avatar */}
      <Section
        title="Profile Photo"
        description="A photo helps people recognise you on GoodsGo."
        icon={<IconCamera />}
      >
        <AvatarSection user={user} />
      </Section>

      {/* Change Password */}
      <Section
        title="Change Password"
        description="Use a strong password you don't use elsewhere."
        icon={<IconLock />}
      >
        <PasswordForm />
      </Section>

      {/* Danger Zone */}
      <Section
        title="Danger Zone"
        description="Permanently deactivate your account."
        icon={<IconTrash />}
        danger
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
    </>
  );
}
