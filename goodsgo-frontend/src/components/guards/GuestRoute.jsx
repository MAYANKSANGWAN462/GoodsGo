import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import { AuthContext } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import Spinner from '../common/Spinner';

/**
 * GuestRoute — prevents authenticated users from reaching auth pages
 * (login, register, forgot-password, reset-password).
 *
 * While the startup silent refresh is in progress (isInitializing),
 * shows a spinner so we don't redirect prematurely before session is restored.
 * Once initialized:
 *   - Authenticated → redirect to marketplace.
 *   - Unauthenticated → render the child route (Outlet).
 */
export default function GuestRoute() {
  const { isAuthenticated } = useAuthStore();
  const { isInitializing } = useContext(AuthContext);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.MARKETPLACE} replace />;
  }

  return <Outlet />;
}
