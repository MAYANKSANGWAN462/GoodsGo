import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';

import { googleLogin } from '../../services/auth.service';
import useAuthStore from '../../stores/useAuthStore';
import { ROUTES } from '../../constants/routes';

/**
 * Renders a full-width Google Sign-In button using Google Identity Services.
 * Handles the complete flow: popup → ID token → backend verification → session.
 *
 * @param {'login'|'signup'} mode - Controls button label text
 */
export default function GoogleSignInButton({ mode = 'login' }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth } = useAuthStore();
  const from = location.state?.from?.pathname || ROUTES.MARKETPLACE;

  // Measure the container so the Google button fills the full available width.
  // The GoogleLogin component only accepts a numeric pixel width (200–400).
  const wrapperRef = useRef(null);
  const [btnWidth, setBtnWidth] = useState(400);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const w = Math.min(400, Math.max(200, Math.floor(el.getBoundingClientRect().width)));
    setBtnWidth(w);
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: (credential) => googleLogin(credential),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      navigate(from, { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || 'Google sign-in failed. Please try again.');
    },
  });

  return (
    <div ref={wrapperRef} className={`w-full flex justify-center ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      <GoogleLogin
        onSuccess={(response) => mutate(response.credential)}
        onError={() => toast.error('Google sign-in failed. Please try again.')}
        width={btnWidth}
        size="large"
        theme="outline"
        shape="rectangular"
        text={mode === 'signup' ? 'signup_with' : 'signin_with'}
      />
    </div>
  );
}

GoogleSignInButton.propTypes = {
  mode: PropTypes.oneOf(['login', 'signup']),
};
