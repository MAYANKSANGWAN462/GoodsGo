import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import useThemeStore from '../../stores/useThemeStore';
import Avatar from '../common/Avatar';
import GoodsGoLogo from '../common/GoodsGoLogo';
import NotificationBell from '../notifications/NotificationBell';

/* ── Theme toggle icons ──────────────────────────────────────── */
function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}

/* ── Nav link with active-state highlight ────────────────────── */
function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
        active
          ? 'text-primary bg-primary/8'
          : 'text-text-muted hover:text-text hover:bg-overlay'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 bg-primary rounded-full" />
      )}
    </Link>
  );
}

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const DESKTOP_NAV_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Bookings',    to: ROUTES.BOOKINGS,    authOnly: true },
  { label: 'Chat',        to: ROUTES.CHAT,        authOnly: true },
];

/**
 * Top navigation bar. Sticky, full-width.
 * Contains: hamburger (mobile) | logo | desktop nav links | [Create Post] | theme toggle | notification bell | avatar menu
 *
 * @param {{ onMenuToggle?: function }} props
 */
export default function Navbar({ onMenuToggle }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <nav className="h-14 border-b border-border bg-surface/95 backdrop-blur-sm flex items-center px-4 gap-2 sticky top-0 z-30">
      {/* Mobile hamburger */}
      {onMenuToggle && (
        <button
          type="button"
          className="md:hidden p-2 -ml-1 rounded-lg text-text-muted hover:text-text hover:bg-overlay transition-colors"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>
      )}

      {/* Logo */}
      <Link
        to={ROUTES.HOME}
        className="flex items-center gap-2 flex-shrink-0 group"
        aria-label="GoodsGo home"
      >
        <GoodsGoLogo size={30} animated={false} />
        <span
          style={{
            fontFamily: "'Barlow Semi Condensed', 'Barlow', sans-serif",
            fontWeight: 700,
            fontSize: '17px',
            letterSpacing: '0.03em',
          }}
          className="text-secondary dark:text-white hidden sm:block"
        >
          GOODS<span className="text-primary">GO</span>
        </span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-0.5 ml-5">
        {DESKTOP_NAV_LINKS.filter((l) => !l.authOnly || isAuthenticated).map((link) => (
          <NavLink key={link.to} to={link.to}>
            {link.label}
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-1">

        {/* Create Post — desktop only, authenticated */}
        {isAuthenticated && (
          <Link
            to={ROUTES.CREATE_POST}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all duration-150 mr-1"
          >
            <PlusIcon />
            Create Post
          </Link>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-overlay transition-colors duration-150"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {isAuthenticated ? (
          <>
            <NotificationBell />

            {/* Avatar dropdown */}
            <div className="relative ml-0.5" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-surface transition-shadow"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label="User menu"
              >
                <Avatar src={user?.profileImageUrl} name={user?.fullName} size="sm" />
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl py-1 z-50 animate-scale-in"
                >
                  {/* User identity */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-text truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  <Link
                    to={ROUTES.MY_PROFILE}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-overlay hover:text-primary transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>

                  <Link
                    to={ROUTES.SAVED}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-overlay hover:text-primary transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Saved Posts
                  </Link>

                  <Link
                    to={ROUTES.PAYMENTS}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-overlay hover:text-primary transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Payments
                  </Link>

                  <Link
                    to={ROUTES.SETTINGS}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-overlay hover:text-primary transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>

                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-subtle transition-colors"
                      onClick={handleLogout}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              to={ROUTES.LOGIN}
              className="hidden sm:block text-sm font-medium text-text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg hover:bg-overlay"
            >
              Log in
            </Link>
            <Link
              to={ROUTES.REGISTER}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all duration-150"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

Navbar.propTypes = {
  onMenuToggle: PropTypes.func,
};
