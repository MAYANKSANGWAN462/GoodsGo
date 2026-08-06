import PropTypes from 'prop-types';
import GoodsGoLogo from './GoodsGoLogo';

/**
 * Non-blocking bottom banner prompting the user to install the PWA.
 * Slides up from the bottom; sits above the mobile bottom nav (mb-16 on mobile).
 * Two variants:
 *   - Android/Chrome: shows an "Install" button that triggers the native prompt.
 *   - iOS/Safari: shows step-by-step share-sheet instructions.
 */
export default function InstallBanner({ isIOS, onInstall, onDismiss }) {
  return (
    <div
      role="dialog"
      aria-label="Install GoodsGo app"
      className={[
        'fixed bottom-0 left-0 right-0 z-40',
        // On mobile leave room for the bottom nav (which is typically ~56-64px).
        // On larger screens center as a floating card.
        'sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-sm sm:rounded-2xl sm:shadow-2xl',
        'bg-surface border-t border-border sm:border',
        'px-4 pt-4 pb-safe-or-4',   // pb-safe-or-4 gracefully adds safe-area inset on iOS
        'animate-fade-in-up',
      ].join(' ')}
    >
      {/* Close button */}
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-overlay transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-6">
        {/* App icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-alt border border-border flex items-center justify-center overflow-hidden">
          <GoodsGoLogo size={36} animated={false} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text leading-snug">
            Add GoodsGo to your home screen
          </p>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            {isIOS
              ? 'Get the full app experience — works offline and launches instantly.'
              : 'Install the app for faster access and a better experience.'}
          </p>
        </div>
      </div>

      {isIOS ? (
        /* iOS: manual steps since Safari has no install API */
        <div className="mt-3 bg-surface-alt border border-border rounded-xl px-3 py-2.5 space-y-1.5">
          <IOSStep n={1}>
            Tap the{' '}
            <span className="inline-flex items-center gap-0.5 align-middle">
              <ShareIcon />
            </span>
            {' '}Share button in Safari
          </IOSStep>
          <IOSStep n={2}>Scroll down and tap <strong className="font-medium text-text">Add to Home Screen</strong></IOSStep>
          <IOSStep n={3}>Tap <strong className="font-medium text-text">Add</strong> to confirm</IOSStep>
        </div>
      ) : (
        /* Android/Chrome: native install prompt */
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-2 text-sm font-medium text-text-muted rounded-lg border border-border hover:bg-overlay transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onInstall}
            className="flex-1 py-2 text-sm font-semibold text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors"
          >
            Install
          </button>
        </div>
      )}

      {isIOS && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full py-2 text-sm text-text-muted hover:text-text transition-colors text-center"
        >
          Got it
        </button>
      )}
    </div>
  );
}

InstallBanner.propTypes = {
  isIOS: PropTypes.bool.isRequired,
  onInstall: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

function IOSStep({ n, children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-xs text-text-muted leading-relaxed">{children}</p>
    </div>
  );
}

IOSStep.propTypes = { n: PropTypes.number.isRequired, children: PropTypes.node.isRequired };

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 text-primary inline"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
