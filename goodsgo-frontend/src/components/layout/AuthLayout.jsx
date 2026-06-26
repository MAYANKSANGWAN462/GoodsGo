import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

/**
 * Centred card layout used by login, register, forgot-password, and reset-password pages.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-alt px-4 py-12">
      <Link to={ROUTES.HOME} className="mb-8 flex items-center gap-2">
        <img
          src="/GOODS_GO.png"
          alt="GoodsGo"
          className="h-10 w-10 object-contain"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span className="text-2xl font-bold text-primary">GoodsGo</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl bg-surface shadow-md border border-border p-8">
        {children}
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
