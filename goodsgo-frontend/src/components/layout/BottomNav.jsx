import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';

/* ── Icons ─────────────────────────────────────────────────────── */
function HomeIcon({ active }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MarketIcon({ active }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.5 2A1.5 1.5 0 004 3.5V5h-.5A1.5 1.5 0 002 6.5v11A1.5 1.5 0 003.5 19h17a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0020.5 5H20V3.5A1.5 1.5 0 0018.5 2h-13zm13 3V3.5h-13V5h13zM3.5 6.5h17v11h-17v-11z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function BookingsIcon({ active }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChatIcon({ active }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}

const GUEST_TABS = [
  { label: 'Home',        to: ROUTES.HOME,        Icon: HomeIcon },
  { label: 'Marketplace', to: ROUTES.MARKETPLACE, Icon: MarketIcon },
];

const AUTH_TABS = [
  { label: 'Market',   to: ROUTES.MARKETPLACE, Icon: MarketIcon },
  { label: 'Bookings', to: ROUTES.BOOKINGS,    Icon: BookingsIcon },
  { label: 'Chat',     to: ROUTES.CHAT,        Icon: ChatIcon },
  { label: 'Profile',  to: ROUTES.MY_PROFILE,  Icon: ProfileIcon },
];

/**
 * Fixed bottom navigation bar shown only on mobile (md:hidden).
 * Authenticated users get: Market | Bookings | [+] | Chat | Profile
 * Guests get: Home | Marketplace
 */
export default function BottomNav() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  if (isAuthenticated) {
    return (
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border pb-safe md:hidden"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex h-16 items-stretch">
          {/* Left two tabs */}
          {AUTH_TABS.slice(0, 2).map(({ label, to, Icon }) => {
            const active = pathname === to || pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150 ${
                  active
                    ? 'text-primary'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* Centre Create Post FAB */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <Link
              to={ROUTES.CREATE_POST}
              aria-label="Create post"
              className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark active:scale-95 transition-all duration-150 -mt-5"
            >
              <PlusIcon />
            </Link>
          </div>

          {/* Right two tabs */}
          {AUTH_TABS.slice(2).map(({ label, to, Icon }) => {
            const active = pathname === to || pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150 ${
                  active
                    ? 'text-primary'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border pb-safe md:hidden"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex h-16 items-stretch">
        {GUEST_TABS.map(({ label, to, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150 ${
                active ? 'text-primary' : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon active={active} />
              <span>{label}</span>
            </Link>
          );
        })}
        <Link
          to={ROUTES.LOGIN}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-text-muted hover:text-text transition-colors duration-150"
        >
          <ProfileIcon active={false} />
          <span>Sign in</span>
        </Link>
      </div>
    </nav>
  );
}
