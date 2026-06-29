import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { ROUTES } from '../../constants/routes';
import { verifyEmail } from '../../services/auth.service';

/**
 * VerifyEmailPage — handles the email-verification link that the backend
 * sends to the user's inbox after registration (or after resending).
 *
 * The backend URL format is:  FRONTEND_URL/verify-email?token=<64-char-hex>
 * This page reads the token from the query string, calls the backend once,
 * and shows the result.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const didVerify = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invocation and missing token.
    if (didVerify.current) return;
    didVerify.current = true;

    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found. Please use the link from your email.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        const code = err?.code;
        if (code === 'ALREADY_VERIFIED') {
          setErrorMessage('This email has already been verified. You can log in below.');
        } else if (err?.status === 400) {
          setErrorMessage(
            err.message ||
              'This verification link is invalid or has expired. Please request a new one.'
          );
        } else {
          setErrorMessage('Something went wrong. Please try again or request a new verification email.');
        }
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 py-8">
          <Spinner size="lg" />
          <p className="text-text-muted text-sm">Verifying your email address…</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-text mb-2">Email verified!</h2>
          <p className="text-text-muted text-sm mb-6">
            Your account is now active. You can log in and start using GoodsGo.
          </p>
          <Link to={ROUTES.LOGIN}>
            <Button fullWidth>Log in</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center py-4">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-text mb-2">Verification failed</h2>
        <p className="text-text-muted text-sm mb-6">{errorMessage}</p>
        <div className="flex flex-col gap-3">
          <Link to={ROUTES.LOGIN}>
            <Button variant="secondary" fullWidth>
              Back to log in
            </Button>
          </Link>
          <p className="text-text-muted text-xs">
            Need a new link?{' '}
            <Link to={ROUTES.LOGIN} className="text-primary hover:underline">
              Log in and resend from your profile
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
