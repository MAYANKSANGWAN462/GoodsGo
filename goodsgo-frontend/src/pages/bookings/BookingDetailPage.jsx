import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import { useBooking, useBookingHistory } from '../../hooks/useBookings';
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge';
import BookingActionButtons from '../../components/bookings/BookingActionButtons';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { formatDate, formatCurrency, timeAgo } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

export default function BookingDetailPage() {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const { data: history, isLoading: historyLoading } = useBookingHistory(bookingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-semibold text-text mb-2">Booking not found</p>
        <p className="text-text-muted text-sm mb-6">
          This booking may have been removed or you don't have access to it.
        </p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.BOOKINGS)}>
          Back to Bookings
        </Button>
      </div>
    );
  }

  const isOwner = booking.postOwner?.id === user?.id;
  const counterparty = isOwner ? booking.requester : booking.postOwner;
  const counterpartyLabel = isOwner ? 'Requester' : 'Post Owner';

  const routeLabel =
    [booking.post?.originCity, booking.post?.destinationCity].filter(Boolean).join(' → ') || '—';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back navigation */}
      <button
        onClick={() => navigate(ROUTES.BOOKINGS)}
        className="flex items-center gap-1 text-text-muted text-sm mb-4 hover:text-primary transition-colors"
      >
        ← Back to Bookings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: main details ─────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Header card */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <BookingStatusBadge status={booking.status} size="md" />
                <p className="text-xl font-semibold text-text mt-2">{routeLabel}</p>
              </div>
              {booking.agreedPrice != null && (
                <p className="text-2xl font-bold text-primary flex-shrink-0">
                  {formatCurrency(booking.agreedPrice)}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {booking.scheduledDate && (
                <>
                  <dt className="text-text-muted">Scheduled Date</dt>
                  <dd className="font-medium text-text">{formatDate(booking.scheduledDate)}</dd>
                </>
              )}
              {booking.pickupAddress && (
                <>
                  <dt className="text-text-muted">Pickup</dt>
                  <dd className="font-medium text-text">{booking.pickupAddress}</dd>
                </>
              )}
              {booking.destinationAddress && (
                <>
                  <dt className="text-text-muted">Destination</dt>
                  <dd className="font-medium text-text">{booking.destinationAddress}</dd>
                </>
              )}
              {booking.goodsDescription && (
                <>
                  <dt className="text-text-muted">Goods</dt>
                  <dd className="font-medium text-text">{booking.goodsDescription}</dd>
                </>
              )}
              {booking.specialInstructions && (
                <>
                  <dt className="text-text-muted">Special Instructions</dt>
                  <dd className="text-text">{booking.specialInstructions}</dd>
                </>
              )}
              {booking.createdAt && (
                <>
                  <dt className="text-text-muted">Requested</dt>
                  <dd className="text-text">{timeAgo(booking.createdAt)}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Action buttons (only shown when eligible actions exist for current user) */}
          {user && (
            <BookingActionButtons booking={booking} currentUserId={user.id} />
          )}

          {/* Status history timeline */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold text-text text-sm mb-4">Status History</h2>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : history && history.length > 0 ? (
              <ol className="relative border-l border-border ml-3 flex flex-col gap-5">
                {history.map((entry, idx) => (
                  <li key={entry.id ?? idx} className="ml-4">
                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-primary" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookingStatusBadge status={entry.status} size="sm" />
                      {entry.changedAt && (
                        <span className="text-xs text-text-muted">{timeAgo(entry.changedAt)}</span>
                      )}
                    </div>
                    {entry.reason && (
                      <p className="text-xs text-text-muted mt-1 italic">"{entry.reason}"</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-text-muted">No status history available.</p>
            )}
          </div>

          {/* Reviews stub — implemented in FE-9 */}
          {booking.status === 'completed' && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold text-text text-sm mb-2">Reviews</h2>
              <p className="text-sm text-text-muted">Reviews — available in a future update.</p>
            </div>
          )}

          {/* Payment stub — implemented in FE-10 */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold text-text text-sm mb-2">Payment</h2>
            <p className="text-sm text-text-muted">Payment — available in a future update.</p>
          </div>
        </div>

        {/* ── Right column: counterparty + linked post ──────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Counterparty info */}
          {counterparty && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="font-semibold text-text text-sm mb-3">{counterpartyLabel}</h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={counterparty.profileImageUrl}
                  name={counterparty.fullName}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-medium text-text text-sm truncate">{counterparty.fullName}</p>
                  {counterparty.rating != null && (
                    <p className="text-xs text-text-muted mt-0.5">
                      ⭐ {Number(counterparty.rating).toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Linked post */}
          {booking.post && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="font-semibold text-text text-sm mb-2">Linked Post</h3>
              <p className="text-sm text-text">{routeLabel}</p>
              <button
                onClick={() => navigate(`/marketplace/posts/${booking.post.id}`)}
                className="mt-2 text-xs text-primary hover:underline focus:outline-none"
              >
                View post →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
