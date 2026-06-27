import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import GoodsGoLogo from '../common/GoodsGoLogo';
import NotificationBell from '../notifications/NotificationBell';

const DESKTOP_NAV_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Bookings', to: ROUTES.BOOKINGS, authOnly: true },
  { label: 'Chat', to: ROUTES.CHAT, authOnly: true },
];

export default function Navbar({ onMenuToggle }) {
  const { user, isAuthenticated, logout } = useAuth();
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
    <nav className="h-14 border-b border-border bg-surface flex items-center px-4 gap-2 sticky top-0 z-30">
      {/* Mobile hamburger — only rendered when a toggle handler is provided */}
      {onMenuToggle && (
        <button
          type="button"
          className="md:hidden p-2 -ml-2 rounded-md text-gray-500 hover:text-primary hover:bg-gray-50 transition-colors"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Logo */}
      <Link
        to={ROUTES.HOME}
        className="flex items-center gap-2 flex-shrink-0"
        aria-label="GoodsGo home"
      >
        <GoodsGoLogo size={32} animated={false} />
        <span
          style={{
            fontFamily: "'Barlow Semi Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '0.02em',
            color: '#003082',
          }}
        >
          GOODS<span style={{ color: '#D31905' }}>GO</span>
        </span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-1 ml-6">
        {DESKTOP_NAV_LINKS.filter((l) => !l.authOnly || isAuthenticated).map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-primary rounded-md hover:bg-gray-50 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1">
        {isAuthenticated ? (
          <>
            <NotificationBell />

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ml-1"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label="User menu"
              >
                <Avatar src={user?.profileImageUrl} name={user?.fullName} size="sm" />
              </button>

              {dropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-lg py-1 z-50"
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
                    className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to={ROUTES.SETTINGS}
                    role="menuitem"
                    className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>

                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full text-left flex items-center px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
                      onClick={handleLogout}
                    >
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
              className="text-sm text-gray-600 hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link to={ROUTES.REGISTER}>
              <Button size="sm">Sign up</Button>
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
