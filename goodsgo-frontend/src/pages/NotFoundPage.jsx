import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4 bg-surface-alt animate-fade-in">
      {/* Illustration */}
      <div className="relative">
        <div className="text-[120px] font-black text-border select-none leading-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-bold text-text">Page not found</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link to={ROUTES.HOME}>
          <Button>Go home</Button>
        </Link>
        <Link to={ROUTES.MARKETPLACE}>
          <Button variant="secondary">Browse Marketplace</Button>
        </Link>
      </div>
    </div>
  );
}
