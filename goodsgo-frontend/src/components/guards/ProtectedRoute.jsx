import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import PropTypes from 'prop-types';
import useAuthStore from '../../stores/useAuthStore';
import { AuthContext } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import Spinner from '../common/Spinner';

/**
 * Redirects unauthenticated users to /login, preserving the attempted path
 * in location.state so LoginPage can redirect back after a successful login.
 *
 * While AuthProvider's startup silent refresh is in progress (isInitializing),
 * renders a full-page spinner instead of immediately redirecting — this prevents
 * users with a valid refresh cookie from being bounced to /login on page reload.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const { isInitializing } = useContext(AuthContext);
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children ?? <Outlet />;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
};
