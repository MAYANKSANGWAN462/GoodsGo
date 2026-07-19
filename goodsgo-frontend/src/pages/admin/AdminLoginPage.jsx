import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { adminLogin } from '../../services/admin.service';
import useAdminStore from '../../stores/useAdminStore';
import { ROUTES } from '../../constants/routes';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const schema = yup.object({
  email:    yup.string().email('Valid email required').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAdminAuth } = useAdminStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({ resolver: yupResolver(schema) });

  const mutation = useMutation({
    mutationFn: ({ email, password }) => adminLogin(email, password),
    onSuccess: ({ data }) => {
      setAdminAuth(data.admin, data.adminToken);
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    },
    onError: (err) => {
      if (err.errors?.length) {
        err.errors.forEach(({ field, message }) => setError(field, { message }));
      } else {
        toast.error(err.message || 'Admin login failed.');
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#071120] via-[#0d2151] to-[#071120] px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Red top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary-light to-primary" />

        <div className="p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <span className="text-primary font-bold text-xl">G</span>
          </div>
          <p className="text-text font-bold text-xl">GoodsGo</p>
          <p className="text-text-muted text-sm mt-0.5">Admin Panel</p>
        </div>

        <h1 className="text-lg font-semibold text-text mb-6 text-center">Sign in to your account</h1>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
          <div className="space-y-4">
            <Input
              id="email"
              label="Admin Email"
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
          </div>

          <Button
            type="submit"
            fullWidth
            className="mt-6"
            isLoading={mutation.isPending}
          >
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          This area is restricted to GoodsGo administrators.
        </p>
        </div>
      </div>
    </div>
  );
}
