import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import GoodsGoLogo from '../common/GoodsGoLogo';
import useAuth from '../../hooks/useAuth';

const GUEST_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Register',    to: ROUTES.REGISTER },
  { label: 'Log in',      to: ROUTES.LOGIN },
];

const AUTH_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Create Post', to: ROUTES.CREATE_POST },
  { label: 'Bookings',    to: ROUTES.BOOKINGS },
  { label: 'My Profile',  to: ROUTES.MY_PROFILE },
];

export default function Footer() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();
  const links = isAuthenticated ? AUTH_LINKS : GUEST_LINKS;

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <GoodsGoLogo size={26} animated={false} />
            <span
              style={{ fontFamily: "'Barlow Semi Condensed', 'Barlow', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.03em' }}
              className="text-secondary dark:text-text"
            >
              GOODS<span className="text-primary">GO</span>
            </span>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex items-center gap-5 flex-wrap justify-center">
            {links.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-sm text-text-muted hover:text-primary transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-text-subtle flex-shrink-0">
            &copy; {year} GoodsGo
          </p>
        </div>
      </div>
    </footer>
  );
}
