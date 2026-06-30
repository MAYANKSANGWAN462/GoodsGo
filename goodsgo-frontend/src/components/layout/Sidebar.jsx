import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import Avatar from '../common/Avatar';

/* ── Nav icons ───────────────────────────────────────────────── */
const icons = {
  marketplace: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  bookings: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  chat: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  notifications: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  saved: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  create: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  profile: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  settings: (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const NAV_LINKS = [
  { label: 'Marketplace',  to: ROUTES.MARKETPLACE, icon: icons.marketplace },
  { label: 'Bookings',     to: ROUTES.BOOKINGS,    icon: icons.bookings,     authOnly: true },
  { label: 'Chat',         to: ROUTES.CHAT,         icon: icons.chat,         authOnly: true },
  { label: 'Notifications',to: ROUTES.NOTIFICATIONS,icon: icons.notifications, authOnly: true },
  { label: 'Saved Posts',  to: ROUTES.SAVED,        icon: icons.saved,        authOnly: true },
  { label: 'Create Post',  to: ROUTES.CREATE_POST,  icon: icons.create,       authOnly: true, accent: true },
  { label: 'My Profile',   to: ROUTES.MY_PROFILE,   icon: icons.profile,      authOnly: true },
  { label: 'Settings',     to: ROUTES.SETTINGS,     icon: icons.settings,     authOnly: true },
];

/**
 * Slide-in drawer navigation panel for mobile screens.
 * Hidden on md+ breakpoints; controlled by parent (MainLayout).
 *
 * @param {{ isOpen: boolean, onClose: function }} props
 */
export default function Sidebar({ isOpen, onClose }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    if (isOpen) onClose();
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-surface z-50 flex flex-col shadow-2xl md:hidden animate-slide-right"
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <span
            style={{ fontFamily: "'Barlow Semi Condensed', 'Barlow', sans-serif", fontWeight: 700, fontSize: '17px', letterSpacing: '0.03em' }}
            className="text-secondary dark:text-white"
          >
            GOODS<span className="text-primary">GO</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-overlay transition-colors"
            aria-label="Close navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info */}
        {isAuthenticated && (
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface-alt flex-shrink-0">
            <Avatar src={user?.profileImageUrl} name={user?.fullName} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user?.fullName}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleLinks.map((link) => {
            const active = pathname === link.to || pathname.startsWith(link.to + '/');
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 mx-2 rounded-lg mb-0.5 ${
                  link.accent && !active
                    ? 'text-primary bg-primary/8 hover:bg-primary/15'
                    : active
                    ? 'text-primary bg-primary/10 border-l-2 border-primary pl-[14px]'
                    : 'text-text-muted hover:text-text hover:bg-overlay'
                }`}
              >
                <span className={active ? 'text-primary' : link.accent ? 'text-primary' : 'text-text-muted'}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 flex-shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 text-sm font-medium text-danger hover:text-danger py-2 px-3 rounded-lg hover:bg-danger-subtle transition-colors"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to={ROUTES.LOGIN}
                className="block text-center text-sm font-semibold text-primary border border-primary rounded-xl py-2.5 hover:bg-primary/8 transition-colors"
              >
                Log in
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="block text-center text-sm font-semibold text-white bg-primary rounded-xl py-2.5 hover:bg-primary-dark transition-colors"
              >
                Sign up free
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
