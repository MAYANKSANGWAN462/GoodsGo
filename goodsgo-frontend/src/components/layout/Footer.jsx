import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface py-8">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-text-muted">
          &copy; {year} GoodsGo. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link
            to={ROUTES.MARKETPLACE}
            className="text-sm text-text-muted hover:text-primary transition-colors"
          >
            Marketplace
          </Link>
          <Link
            to={ROUTES.REGISTER}
            className="text-sm text-text-muted hover:text-primary transition-colors"
          >
            Register
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className="text-sm text-text-muted hover:text-primary transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}
