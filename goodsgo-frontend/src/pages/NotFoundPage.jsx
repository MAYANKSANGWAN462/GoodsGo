import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold text-text">Page not found</h1>
      <p className="text-text-muted">The page you are looking for does not exist or has been moved.</p>
      <Link to={ROUTES.HOME}>
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
