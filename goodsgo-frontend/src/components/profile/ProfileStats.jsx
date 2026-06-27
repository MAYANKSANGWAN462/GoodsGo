import PropTypes from 'prop-types';

function StatItem({ value, label }) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <span className="text-2xl font-bold text-text">{value ?? 0}</span>
      <span className="text-xs text-text-muted mt-0.5">{label}</span>
    </div>
  );
}

StatItem.propTypes = {
  value: PropTypes.number,
  label: PropTypes.string.isRequired,
};

function Divider() {
  return <div className="w-px h-8 bg-border self-center" />;
}

/**
 * Displays aggregate profile statistics: posts, bookings, reviews, and optionally cancellations.
 */
export default function ProfileStats({ postCount, bookingCount, reviewCount, cancellationCount }) {
  return (
    <div className="flex items-center justify-around bg-surface-alt border border-border rounded-xl p-4 shadow-sm">
      <StatItem value={postCount} label="Posts" />
      <Divider />
      <StatItem value={bookingCount} label="Bookings" />
      <Divider />
      <StatItem value={reviewCount} label="Reviews" />
      {cancellationCount !== undefined && (
        <>
          <Divider />
          <StatItem value={cancellationCount} label="Cancellations" />
        </>
      )}
    </div>
  );
}

ProfileStats.propTypes = {
  postCount: PropTypes.number,
  bookingCount: PropTypes.number,
  reviewCount: PropTypes.number,
  cancellationCount: PropTypes.number,
};
