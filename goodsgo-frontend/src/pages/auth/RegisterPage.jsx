import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';
import { register as registerUser } from '../../services/auth.service';

const schema = yup.object({
  fullName: yup
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters')
    .required('Full name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('Password is required'),
  phone: yup
    .string()
    .matches(/^[+]?[\d\s-]{7,15}$/, 'Enter a valid phone number')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

export default function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      toast.success('Account created! Please check your email to verify your account.');
      navigate(ROUTES.LOGIN);
    },
    onError: (err) => {
      if (err.errors?.length) {
        err.errors.forEach(({ field, message }) => setError(field, { message }));
      } else {
        toast.error(err.message || 'Registration failed.');
      }
    },
  });

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-text mb-6">Create your account</h2>

      <form onSubmit={handleSubmit((values) => mutate(values))} noValidate className="flex flex-col gap-4">
        <Input
          id="fullName"
          label="Full name"
          type="text"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          helperText="Min 8 chars, one uppercase, one number."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          id="phone"
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Button type="submit" isLoading={isPending} fullWidth>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
