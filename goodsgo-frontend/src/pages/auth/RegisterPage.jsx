import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import AuthSplitLayout from '../../components/layout/AuthSplitLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';
import { register as registerUser, login } from '../../services/auth.service';
import useAuthStore from '../../stores/useAuthStore';

// Backend Joi phone pattern: /^\+?[0-9]{10,15}$/ — digits only, optional leading +
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
    .matches(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (10–15 digits, optional + prefix)')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

// Backend field names → React Hook Form field names
const BACKEND_FIELD_MAP = { full_name: 'fullName' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ fullName, email, password, phone }) => {
      // Step 1 — create the account
      await registerUser({
        full_name: fullName,
        email,
        password,
        ...(phone ? { phone } : {}),
      });
      // Step 2 — auto-login so the user doesn't have to log in manually
      return login({ email, password });
    },
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success('Account created! Check your inbox to verify your email.');
      navigate(ROUTES.MARKETPLACE, { replace: true });
    },
    onError: (err) => {
      if (err.errors?.length) {
        err.errors.forEach(({ field, message }) => {
          // Map snake_case backend field names to camelCase form field names
          setError(BACKEND_FIELD_MAP[field] ?? field, { message });
        });
      } else {
        toast.error(err.message || 'Registration failed.');
      }
    },
  });

  return (
    <AuthSplitLayout mode="signup">
      <h2 className="text-2xl font-bold text-text mb-6">Create your account</h2>

      <form onSubmit={handleSubmit(mutate)} noValidate className="flex flex-col gap-4">
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
    </AuthSplitLayout>
  );
}
