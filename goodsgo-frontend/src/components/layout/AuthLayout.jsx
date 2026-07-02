import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import GoodsGoLogo from '../common/GoodsGoLogo';

/**
 * Centred card layout used by login, register, forgot-password, and reset-password pages.
 */
export default function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-surface-alt"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 60% 0%, rgba(211,25,5,0.06) 0%, transparent 60%), radial-gradient(ellipse at 0% 80%, rgba(0,48,130,0.04) 0%, transparent 50%)',
      }}
    >
      {/* Logo */}
      <Link to={ROUTES.HOME} className="mb-8 flex flex-col items-center gap-2 group">
        <GoodsGoLogo size={48} />
        <span className="text-xl font-bold text-text group-hover:text-primary transition-colors">
          GoodsGo
        </span>
        <span className="text-xs text-text-muted -mt-1">India&apos;s logistics marketplace</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md animate-scale-in">
        <div className="rounded-2xl bg-surface shadow-lg border border-border p-8">
          {children}
        </div>

        {/* Trust signals below card */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg className="w-3.5 h-3.5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Encrypted
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg className="w-3.5 h-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Free to join
          </span>
        </div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
