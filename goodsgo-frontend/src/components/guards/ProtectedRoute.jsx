import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuthStore from '../../stores/useAuthStore';
import { ROUTES } from '../../constants/routes';
import Spinner from '../common/Spinner';

/**
 * Redirects unauthenticated users to /login, preserving the attempted path
 * in location.state so LoginPage can redirect back after a successful login.
 *
 * Renders children (via Outlet or the `element` prop) when authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // During the initial silent refresh the store has not been populated yet.
  // The AuthProvider sets auth state synchronously from the refreshToken response,
  // but there is a brief window on first render where isAuthenticated is false.
  // We handle this by rendering a full-page spinner only on the root "/" path.
  // For all other routes, redirect to login (the refresh has already completed by
  // the time the user navigates to a protected route in normal usage).

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children ?? <Outlet />;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
};
