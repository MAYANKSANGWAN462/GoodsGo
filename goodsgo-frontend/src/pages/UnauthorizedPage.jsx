import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-7xl font-bold text-warning">403</p>
      <h1 className="text-2xl font-semibold text-text">Access denied</h1>
      <p className="text-text-muted">You do not have permission to view this page.</p>
      <Link to={ROUTES.HOME}>
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
