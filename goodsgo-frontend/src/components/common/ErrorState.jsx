import PropTypes from 'prop-types';
import Button from './Button';

/**
 * Error state display — shows a contextual icon, title, message, and a retry action.
 *
 * @param {object}          props
 * @param {'network'|'notFound'|'forbidden'|'server'|'generic'} [props.type='generic']
 * @param {string}          [props.title]       - Override the default title for the error type
 * @param {string}          [props.message]     - Override the default message for the error type
 * @param {function}        [props.onRetry]     - If provided, renders a retry button
 * @param {string}          [props.retryLabel='Try again']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
export default function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  size = 'md',
}) {
  const defaults = {
    network:  { title: 'Connection problem',   message: 'Check your internet connection and try again.' },
    notFound: { title: 'Not found',            message: 'The item you're looking for doesn't exist or has been removed.' },
    forbidden:{ title: 'Access denied',        message: 'You don't have permission to view this content.' },
    server:   { title: 'Something went wrong', message: 'Our servers encountered an error. Please try again in a moment.' },
    generic:  { title: 'Something went wrong', message: 'An unexpected error occurred. Please try again.' },
  };

  const { title: defaultTitle, message: defaultMessage } = defaults[type] ?? defaults.generic;
  const padClass      = size === 'sm' ? 'py-8'   : size === 'lg' ? 'py-20' : 'py-14';
  const iconSizeClass = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const titleClass    = size === 'sm' ? 'text-base'  : size === 'lg' ? 'text-xl'   : 'text-lg';

  return (
    <div className={`flex flex-col items-center justify-center ${padClass} px-4 text-center`}>
      {/* Icon */}
      <div
        className={`mb-5 ${iconSizeClass} rounded-2xl bg-danger-subtle flex items-center justify-center text-danger shadow-sm`}
      >
        {type === 'notFound' ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ) : type === 'forbidden' ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : type === 'network' ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M9 10a3 3 0 106 0M3 3l18 18" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </div>

      <h3 className={`${titleClass} font-semibold text-text mb-2`}>
        {title ?? defaultTitle}
      </h3>

      <p className="text-text-muted text-sm leading-relaxed max-w-sm mb-5">
        {message ?? defaultMessage}
      </p>

      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

ErrorState.propTypes = {
  type: PropTypes.oneOf(['network', 'notFound', 'forbidden', 'server', 'generic']),
  title: PropTypes.string,
  message: PropTypes.string,
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};
