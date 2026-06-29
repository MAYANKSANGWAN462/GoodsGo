import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';
import { useBooking, useBookingHistory } from '../../hooks/useBookings';
import { useBookingReviews, useDeleteReview } from '../../hooks/useReviews';
import { useInitiatePayment, useVerifyPayment } from '../../hooks/usePayments';
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge';
import BookingActionButtons from '../../components/bookings/BookingActionButtons';
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewForm from '../../components/reviews/ReviewForm';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { formatDate, formatCurrency, timeAgo } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

/**
 * Loads the Razorpay checkout script dynamically on demand (not at app startup).
 * Resolves true on success, false on network failure.
 * @returns {Promise<boolean>}
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingDetailPage() {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [paymentVerified, setPaymentVerified] = useState(false);

  // All hooks must be called before any conditional returns
  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const { data: history, isLoading: historyLoading } = useBookingHistory(bookingId);
  const { data: bookingReviewsData, isLoading: bookingReviewsLoading } = useBookingReviews(bookingId);
  const { mutate: deleteReview } = useDeleteReview();
  const { mutate: initiatePayment, isPending: initiateLoading } = useInitiatePayment();
  const { mutate: verifyPayment } = useVerifyPayment();

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

  // Derive review context from booking parties
  const reviewRole = isOwner ? 'as_transporter' : 'as_customer';
  const revieweeId = isOwner ? booking.requester?.id : booking.postOwner?.id;
  const bookingReviews = bookingReviewsData?.data ?? [];
  const currentUserHasReviewed =
    Boolean(user) && bookingReviews.some((r) => r.reviewer?.id === user.id);

  const routeLabel =
    [booking.post?.originCity, booking.post?.destinationCity].filter(Boolean).join(' → ') || '—';

  function handleDeleteReview(reviewId) {
    setDeletingReviewId(reviewId);
    deleteReview(reviewId, {
      onSettled: () => setDeletingReviewId(null),
    });
  }

  function handlePayNow() {
    initiatePayment(bookingId, {
      onSuccess: async (result) => {
        const orderData = result.data;
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error('Could not load payment gateway. Please check your connection and try again.');
          return;
        }
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          name: 'GoodsGo',
          description: 'Booking payment',
          prefill: { name: user?.fullName || '' },
          theme: { color: '#f97316' },
          handler: function (response) {
            verifyPayment(
              {
                bookingId,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              {
                onSuccess: () => setPaymentVerified(true),
              }
            );
          },
        };
        new window.Razorpay(options).open();
      },
    });
  }

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

          {/* Reviews section — shown only for completed bookings */}
          {booking.status === 'completed' && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold text-text text-sm mb-4">Reviews</h2>

              {bookingReviewsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  {/* Existing reviews for this booking */}
                  {bookingReviews.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden mb-4">
                      {bookingReviews.map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          showRoleBadge
                          onDelete={handleDeleteReview}
                          isDeleting={deletingReviewId === review.id}
                        />
                      ))}
                    </div>
                  )}

                  {currentUserHasReviewed ? (
                    /* Current user has already reviewed — show waiting message if partner hasn't */
                    bookingReviews.length < 2 && (
                      <p className="text-sm text-text-muted italic">
                        Waiting for the other party to leave a review.
                      </p>
                    )
                  ) : (
                    /* Current user hasn't reviewed yet — show the form */
                    <div className={bookingReviews.length > 0 ? 'pt-4 border-t border-border' : ''}>
                      <p className="text-sm font-medium text-text mb-3">Leave a Review</p>
                      <ReviewForm
                        bookingId={bookingId}
                        revieweeId={revieweeId}
                        reviewRole={reviewRole}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Payment section — shown for accepted bookings */}
          {booking.status === 'accepted' && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold text-text text-sm mb-4">Payment</h2>

              {paymentVerified ? (
                /* Verified in this session — show confirmation */
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xl flex-shrink-0">✅</span>
                  <div>
                    <p className="text-sm font-medium text-green-800">Payment confirmed</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Your payment has been received. The transporter will now begin the
                      journey and mark the booking in progress.
                    </p>
                  </div>
                </div>
              ) : isOwner ? (
                /* Post owner view — waiting for requester to pay */
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-xl flex-shrink-0">⏳</span>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Awaiting payment</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Waiting for the requester to complete the payment.
                      {booking.paymentDeadline && (
                        <> Payment is due by {formatDate(booking.paymentDeadline)}.</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                /* Requester view — pay now */
                <div className="flex flex-col gap-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {booking.agreedPrice != null && (
                      <>
                        <dt className="text-text-muted">Amount Due</dt>
                        <dd className="font-semibold text-text">
                          {formatCurrency(booking.agreedPrice)}
                        </dd>
                      </>
                    )}
                    {booking.platformCommissionPct != null && (
                      <>
                        <dt className="text-text-muted">Platform Fee</dt>
                        <dd className="text-text">{booking.platformCommissionPct}%</dd>
                      </>
                    )}
                    {booking.paymentDeadline && (
                      <>
                        <dt className="text-text-muted">Pay By</dt>
                        <dd className="text-text">{formatDate(booking.paymentDeadline)}</dd>
                      </>
                    )}
                  </dl>

                  <Button
                    variant="primary"
                    onClick={handlePayNow}
                    isLoading={initiateLoading}
                    disabled={initiateLoading}
                  >
                    💳 Pay Now
                  </Button>

                  <p className="text-xs text-text-muted">
                    Payments are processed securely via Razorpay. GoodsGo holds
                    funds in escrow until the booking is completed.
                  </p>
                </div>
              )}
            </div>
          )}
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

          {/* Chat shortcut — shown once a conversation exists (booking accepted) */}
          {booking.conversation?.id && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="font-semibold text-text text-sm mb-2">Chat</h3>
              <p className="text-xs text-text-muted mb-3">
                Coordinate directly with{' '}
                {counterparty?.fullName ?? 'the other party'} about this booking.
              </p>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() =>
                  navigate(`${ROUTES.CHAT}?conversation=${booking.conversation.id}`)
                }
              >
                Open Chat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
