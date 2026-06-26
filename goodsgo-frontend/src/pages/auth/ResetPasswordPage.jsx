import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';
import { resetPassword } from '../../services/auth.service';

const schema = yup.object({
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ password }) => resetPassword({ token, password }),
    onSuccess: () => {
      setDone(true);
    },
    onError: (err) => {
      const code = err.code;
      if (code === 'TOKEN_EXPIRED') {
        toast.error('This reset link has expired. Please request a new one.');
      } else if (code === 'TOKEN_INVALID') {
        toast.error('This reset link is invalid. Please request a new one.');
      } else {
        toast.error(err.message || 'Password reset failed.');
      }
    },
  });

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center">
          <p className="text-danger font-medium mb-4">Invalid reset link.</p>
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-primary hover:underline text-sm">
            Request a new one
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-text mb-2">Password reset</h2>
          <p className="text-text-muted text-sm mb-6">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Button onClick={() => navigate(ROUTES.LOGIN)} fullWidth>
            Log in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-text mb-6">Reset your password</h2>

      <form onSubmit={handleSubmit((values) => mutate(values))} noValidate className="flex flex-col gap-4">
        <Input
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          helperText="Min 8 chars, one uppercase, one number."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isPending} fullWidth>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
