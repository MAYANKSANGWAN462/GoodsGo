import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import AuthSplitLayout from '../../components/layout/AuthSplitLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';
import { login } from '../../services/auth.service';
import useAuthStore from '../../stores/useAuthStore';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const from = location.state?.from?.pathname || ROUTES.MARKETPLACE;
  const justRegistered = location.state?.registered === true;
  const registeredEmail = location.state?.email ?? null;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: login,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      navigate(from, { replace: true });
    },
    onError: (err) => {
      if (err.errors?.length) {
        err.errors.forEach(({ field, message }) => setError(field, { message }));
      } else {
        toast.error(err.message || 'Login failed.');
      }
    },
  });

  return (
    <AuthSplitLayout mode="login">
      {justRegistered && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <p className="font-medium">Account created!</p>
          <p className="text-text-muted text-xs mt-0.5">
            We sent a verification link to{registeredEmail ? ` ${registeredEmail}` : ' your email'}.
            You can log in now — verify your email when convenient.
          </p>
        </div>
      )}

      <h2 className="text-2xl font-bold text-text mb-6">Welcome back</h2>

      <form onSubmit={handleSubmit((values) => mutate(values))} noValidate className="flex flex-col gap-4">
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isPending} fullWidth>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.REGISTER} className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
