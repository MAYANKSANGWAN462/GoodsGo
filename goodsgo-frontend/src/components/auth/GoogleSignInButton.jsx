import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';

import { googleLogin } from '../../services/auth.service';
import useAuthStore from '../../stores/useAuthStore';
import { ROUTES } from '../../constants/routes';

/**
 * Full-width Google Sign-In button.
 * Width is measured synchronously before first paint (useLayoutEffect) so the
 * Google iframe renders at the correct size immediately — no resize flash.
 *
 * @param {'login'|'signup'} mode - Controls button label text
 */
export default function GoogleSignInButton({ mode = 'login' }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { setAuth } = useAuthStore();
  const from        = location.state?.from?.pathname || ROUTES.MARKETPLACE;

  const wrapperRef = useRef(null);
  // null means "not yet measured" — GoogleLogin is not rendered until we know width
  const [btnWidth, setBtnWidth] = useState(null);

  // useLayoutEffect runs synchronously after DOM insertion, before browser paint.
  // This means the Google button renders at the correct width on the very first frame.
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const w = Math.min(400, Math.max(200, Math.floor(wrapperRef.current.getBoundingClientRect().width)));
    setBtnWidth(w);
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: (credential) => googleLogin(credential),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      if (data.isNewUser) {
        toast.success('Account created! Welcome to GoodsGo.');
      } else if (data.isLinked) {
        toast.success('Google linked to your existing account. Welcome back!');
      }
      navigate(from, { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || 'Google sign-in failed. Please try again.');
    },
  });

  return (
    <div
      ref={wrapperRef}
      className={`w-full flex justify-center${isPending ? ' opacity-60 pointer-events-none' : ''}`}
    >
      {btnWidth !== null && (
        <GoogleLogin
          onSuccess={(response) => mutate(response.credential)}
          onError={() => toast.error('Google sign-in failed. Please try again.')}
          width={btnWidth}
          size="large"
          theme="outline"
          shape="rectangular"
          text={mode === 'signup' ? 'signup_with' : 'signin_with'}
        />
      )}
    </div>
  );
}

GoogleSignInButton.propTypes = {
  mode: PropTypes.oneOf(['login', 'signup']),
};
