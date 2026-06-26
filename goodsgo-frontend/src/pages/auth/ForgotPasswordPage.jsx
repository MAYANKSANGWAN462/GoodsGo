import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';
import { forgotPassword } from '../../services/auth.service';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: forgotPassword,
    // Backend always returns 200 regardless of email existence (anti-enumeration).
    onSettled: () => {
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-text mb-2">Check your inbox</h2>
          <p className="text-text-muted text-sm mb-6">
            If an account exists for that email address, you will receive a password reset link shortly.
          </p>
          <Link to={ROUTES.LOGIN} className="text-primary hover:underline text-sm font-medium">
            Back to log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-text mb-2">Forgot your password?</h2>
      <p className="text-text-muted text-sm mb-6">
        Enter your email address and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit((values) => mutate(values))} noValidate className="flex flex-col gap-4">
        <Input
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" isLoading={isPending} fullWidth>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link to={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  );
}
