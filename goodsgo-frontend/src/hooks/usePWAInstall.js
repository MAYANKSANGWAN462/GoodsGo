import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'pwa_install_dismissed_until';
const DISMISS_DAYS = 14;
const SHOW_DELAY_MS = 45_000; // show after 45 s of browsing

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isDismissed() {
  const until = localStorage.getItem(STORAGE_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobileOrTablet() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;
}

/**
 * Manages the browser install prompt (beforeinstallprompt) and iOS fallback.
 *
 * Returns:
 *   - showBanner  — whether to render the install banner
 *   - isIOS       — true on iOS so the UI can show manual instructions
 *   - triggerInstall — call to show the native Chrome install prompt
 *   - dismiss     — call when the user closes the banner (snoozes for 14 days)
 *   - neverShow   — call after a successful install
 */
export function usePWAInstall() {
  const deferredPromptRef = useRef(null);
  const [showBanner, setShowBanner] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    // Already installed or dismissed — do nothing.
    if (isStandalone() || isDismissed() || !isMobileOrTablet()) return;

    // Capture the browser's deferred install prompt (Chrome / Android).
    function onBeforeInstall(e) {
      e.preventDefault();
      deferredPromptRef.current = e;
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // On iOS, beforeinstallprompt never fires — show the manual-instructions
    // banner instead after the delay.
    const timer = setTimeout(() => {
      if (isStandalone() || isDismissed()) return;
      // For Android: only show if we actually captured the prompt.
      // For iOS: always show (we'll render static instructions).
      if (deferredPromptRef.current || ios) {
        setShowBanner(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      clearTimeout(timer);
    };
  }, [ios]);

  function triggerInstall() {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    prompt.userChoice.then(() => {
      deferredPromptRef.current = null;
      neverShow();
    });
  }

  function dismiss() {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(until));
    setShowBanner(false);
  }

  function neverShow() {
    // Store a very far future timestamp so isDismissed() stays true forever.
    localStorage.setItem(STORAGE_KEY, String(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000));
    setShowBanner(false);
  }

  return { showBanner, isIOS: ios, triggerInstall, dismiss };
}
