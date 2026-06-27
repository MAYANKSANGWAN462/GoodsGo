import PropTypes from 'prop-types';

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function VerifiedBadge({ label, verified }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        verified
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}
    >
      {verified ? <CheckIcon /> : <XIcon />}
      {label}
    </span>
  );
}

VerifiedBadge.propTypes = {
  label: PropTypes.string.isRequired,
  verified: PropTypes.bool.isRequired,
};

/**
 * Renders email, phone, and identity verification status badges for a user profile.
 */
export default function VerificationBadges({ isEmailVerified, isPhoneVerified, isIdentityVerified }) {
  return (
    <div className="flex flex-wrap gap-2">
      <VerifiedBadge label="Email" verified={Boolean(isEmailVerified)} />
      <VerifiedBadge label="Phone" verified={Boolean(isPhoneVerified)} />
      <VerifiedBadge label="Identity" verified={Boolean(isIdentityVerified)} />
    </div>
  );
}

VerificationBadges.propTypes = {
  isEmailVerified: PropTypes.bool,
  isPhoneVerified: PropTypes.bool,
  isIdentityVerified: PropTypes.bool,
};
