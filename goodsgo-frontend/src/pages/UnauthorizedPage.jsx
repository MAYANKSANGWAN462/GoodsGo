import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4 bg-surface-alt animate-fade-in">
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-warning-subtle border-4 border-warning/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <div className="space-y-2 max-w-sm">
        <p className="text-5xl font-black text-warning">403</p>
        <h1 className="text-2xl font-bold text-text">Access Denied</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          You don&apos;t have permission to view this page. If you believe this is a mistake, please contact support.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={() => navigate(-1)} variant="secondary">
          Go back
        </Button>
        <Link to={ROUTES.HOME}>
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  );
}
