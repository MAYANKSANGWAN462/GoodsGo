import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import Avatar from '../common/Avatar';

const NAV_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Bookings', to: ROUTES.BOOKINGS, authOnly: true },
  { label: 'Chat', to: ROUTES.CHAT, authOnly: true },
  { label: 'Notifications', to: ROUTES.NOTIFICATIONS, authOnly: true },
  { label: 'Saved Posts', to: ROUTES.SAVED, authOnly: true },
  { label: 'Create Post', to: ROUTES.CREATE_POST, authOnly: true },
  { label: 'My Profile', to: ROUTES.MY_PROFILE, authOnly: true },
  { label: 'Settings', to: ROUTES.SETTINGS, authOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) onClose();
    // intentionally omits onClose from deps — we only want to fire on pathname change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    logout();
  };

  const visibleLinks = NAV_LINKS.filter((l) => !l.authOnly || isAuthenticated);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-surface z-50 flex flex-col shadow-2xl md:hidden"
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <span className="font-bold text-primary text-lg">GoodsGo</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:text-primary hover:bg-gray-50 transition-colors"
            aria-label="Close navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Authenticated user info */}
        {isAuthenticated && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <Avatar src={user?.profileImageUrl} name={user?.fullName} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user?.fullName}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center px-4 py-3 text-sm transition-colors ${
                pathname === link.to
                  ? 'text-primary bg-orange-50 font-medium border-r-2 border-primary'
                  : 'text-gray-700 hover:text-primary hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Footer: auth actions */}
        <div className="border-t border-border p-4 flex-shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left text-sm text-danger hover:text-red-700 py-2 transition-colors"
            >
              Log out
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to={ROUTES.LOGIN}
                className="block text-center text-sm text-primary border border-primary rounded-lg py-2.5 hover:bg-orange-50 transition-colors font-medium"
              >
                Log in
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="block text-center text-sm text-white bg-primary rounded-lg py-2.5 hover:bg-primary-dark transition-colors font-medium"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
