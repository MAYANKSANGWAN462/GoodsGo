import PropTypes from 'prop-types';

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 text-text-muted">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      {message && (
        <p className="text-text-muted text-sm mb-4 max-w-sm">{message}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  action: PropTypes.node,
};
