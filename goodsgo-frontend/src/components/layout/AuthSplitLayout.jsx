import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import AuthScene from './AuthScene';

const MODE_COPY = {
  login: {
    title: 'Welcome back to the road.',
    subtitle: 'Log in to track shipments, manage bookings and reach every highway and city.',
  },
  signup: {
    title: 'Join India’s goods network.',
    subtitle:
      'Create an account to move goods or grow your transport business — doorstep to doorstep.',
  },
};

/**
 * Builds the class string for one segmented-control tab.
 *
 * @param {boolean} active - Whether this tab matches the current page.
 * @returns {string} Tailwind class string for the tab link.
 */
function tabClass(active) {
  return [
    'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all',
    active
      ? 'bg-surface text-text shadow-sm'
      : 'text-text-muted hover:text-text',
  ].join(' ');
}

/**
 * Split-screen auth layout: animated GoodsGo yard scene on the left
 * (top banner on mobile) and the form panel on the right. Used by the
 * login and register pages; the remaining auth pages keep AuthLayout.
 *
 * @param {object} props
 * @param {'login'|'signup'} props.mode - Active page; drives tab state and marquee copy.
 * @param {import('react').ReactNode} props.children - Form content for the right panel.
 */
export default function AuthSplitLayout({ mode, children }) {
  const copy = MODE_COPY[mode];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Scene panel — fixed-height banner on mobile, 56% column on desktop */}
      <div className="relative h-60 shrink-0 overflow-hidden sm:h-80 lg:h-auto lg:min-w-0 lg:flex-[1_1_56%]">
        <AuthScene title={copy.title} subtitle={copy.subtitle} />
      </div>

      {/* Form panel */}
      <div className="flex min-w-0 flex-1 items-start justify-center bg-surface px-5 py-8 sm:px-10 sm:py-10 lg:flex-[1_1_44%] lg:items-center lg:p-14">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Segmented Log in / Sign up tabs */}
          <div className="mb-6 flex gap-1 rounded-xl bg-surface-alt p-1">
            <Link to={ROUTES.LOGIN} className={tabClass(mode === 'login')} aria-current={mode === 'login' ? 'page' : undefined}>
              Log in
            </Link>
            <Link to={ROUTES.REGISTER} className={tabClass(mode === 'signup')} aria-current={mode === 'signup' ? 'page' : undefined}>
              Sign up
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

AuthSplitLayout.propTypes = {
  mode: PropTypes.oneOf(['login', 'signup']).isRequired,
  children: PropTypes.node.isRequired,
};
