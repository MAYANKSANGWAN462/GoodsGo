import { Navigate, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAdminStore from '../../stores/useAdminStore';
import { ROUTES } from '../../constants/routes';

/**
 * Redirects non-admin visitors to /admin/login.
 * Full admin auth is implemented in the FE-Admin block.
 */
export default function AdminRoute({ children }) {
  const { isAdminAuthenticated } = useAdminStore();

  if (!isAdminAuthenticated) {
    return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  }

  return children ?? <Outlet />;
}

AdminRoute.propTypes = {
  children: PropTypes.node,
};
