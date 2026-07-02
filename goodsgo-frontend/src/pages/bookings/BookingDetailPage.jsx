import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
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
 * Loads the Razorpay checkout script dynamically on demand.
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

// ── Icon components ───────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightSmIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function StarFilledIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  );
}

StarFilledIcon.propTypes = { className: PropTypes.string };

function ChatBubbleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ── Status-derived style maps ─────────────────────────────────────────────────

const STATUS_ACCENT = {
  pending:       'border-l-amber-400',
  accepted:      'border-l-green-500',
  in_progress:   'border-l-blue-500',
  completed:     'border-l-blue-400',
  cancelled:     'border-l-red-500',
  rejected:      'border-l-red-400',
  auto_rejected: 'border-l-gray-400',
};

const STATUS_DOT = {
  pending:       'bg-amber-400',
  accepted:      'bg-green-500',
  in_progress:   'bg-blue-500',
  completed:     'bg-blue-400',
  cancelled:     'bg-red-500',
  rejected:      'bg-red-400',
  auto_rejected: 'bg-gray-400',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarCard({ children }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="h-0.5 w-full bg-primary/25" />
      <div className="p-4">{children}</div>
    </div>
  );
}

SidebarCard.propTypes = { children: PropTypes.node.isRequired };

function DetailRow({ icon, label, value, wide }) {
  return (
    <div className={`flex items-start gap-2 ${wide ? 'sm:col-span-2' : ''}`}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

DetailRow.propTypes = {
  icon:  PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  wide:  PropTypes.bool,
};

// ── Main component ────────────────────────────────────────────────────────────

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
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text mb-2">Booking not found</h2>
        <p className="text-text-muted text-sm mb-6 max-w-xs">
          This booking may have been removed or you don&apos;t have access to it.
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

  const postType = booking.post?.postType;
  const isNeedTransport = postType === 'need_transport';
  const shipperId     = isNeedTransport ? booking.postOwner?.id : booking.requester?.id;
  const transporterId = isNeedTransport ? booking.requester?.id : booking.postOwner?.id;
  const isShipper = user?.id === shipperId;

  const reviewRole  = isShipper ? 'as_transporter' : 'as_customer';
  const revieweeId  = isShipper ? transporterId : shipperId;
  const bookingReviews = bookingReviewsData?.data ?? [];
  const currentUserHasReviewed =
    Boolean(user) && bookingReviews.some((r) => (r.reviewer?.id ?? r.reviewerId) === user.id);

  const originCity = booking.post?.originCity;
  const destCity   = booking.post?.destinationCity;
  const routeLabel =
    [originCity, destCity].filter(Boolean).join(' → ') || '—';

  const accentBorder = STATUS_ACCENT[booking.status] ?? 'border-l-gray-300';

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
          prefill: {
            name:    user?.fullName    || '',
            email:   user?.email       || '',
            contact: user?.phoneNumber || '',
          },
          notes: { booking_id: bookingId },
          theme: { color: '#f97316' },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI',
                  instruments: [{ method: 'upi' }],
                },
                other: {
                  name: 'Other Methods',
                  instruments: [
                    { method: 'card' },
                    { method: 'netbanking' },
                    { method: 'wallet' },
                    { method: 'paylater' },
                  ],
                },
              },
              sequence: ['block.upi', 'block.other'],
              preferences: { show_default_blocks: false },
            },
          },
          handler: function (response) {
            verifyPayment(
              {
                bookingId,
                orderId:   response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              { onSuccess: () => setPaymentVerified(true) }
            );
          },
          modal: { ondismiss: function () {} },
        };
        new window.Razorpay(options).open();
      },
    });
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-5" aria-label="breadcrumb">
        <button
          type="button"
          onClick={() => navigate(ROUTES.BOOKINGS)}
          className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
        >
          <ChevronLeftIcon />
          My Bookings
        </button>
        <ChevronRightSmIcon />
        <span className="text-text-muted">Booking Detail</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Header card with status-coloured left accent */}
          <div className={`bg-surface rounded-xl border border-border border-l-4 ${accentBorder} overflow-hidden`}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex-1 min-w-0">
                  <BookingStatusBadge status={booking.status} size="md" />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {originCity ? (
                      <>
                        <span className="text-xl font-bold text-text">{originCity}</span>
                        <ArrowRightIcon />
                        {destCity && (
                          <span className="text-xl font-bold text-text">{destCity}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xl font-bold text-text">{routeLabel}</span>
                    )}
                  </div>
                </div>
                {booking.agreedPrice != null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-text-muted mb-0.5">Agreed Price</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(booking.agreedPrice)}
                    </p>
                  </div>
                )}
              </div>

              {/* Detail grid with icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border">
                {booking.scheduledDate && (
                  <DetailRow
                    icon={<CalendarIcon />}
                    label="Scheduled Date"
                    value={formatDate(booking.scheduledDate)}
                  />
                )}
                {booking.pickupAddress && (
                  <DetailRow icon={<MapPinIcon />} label="Pickup" value={booking.pickupAddress} />
                )}
                {booking.destinationAddress && (
                  <DetailRow icon={<MapPinIcon />} label="Destination" value={booking.destinationAddress} />
                )}
                {booking.goodsDescription && (
                  <DetailRow icon={<PackageIcon />} label="Goods" value={booking.goodsDescription} />
                )}
                {booking.specialInstructions && (
                  <DetailRow icon={<NoteIcon />} label="Special Instructions" value={booking.specialInstructions} wide />
                )}
                {booking.createdAt && (
                  <DetailRow icon={<ClockIcon />} label="Requested" value={timeAgo(booking.createdAt)} />
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {user && (
            <BookingActionButtons booking={booking} currentUserId={user.id} />
          )}

          {/* Status history timeline */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
              <ClockIcon />
              Status History
            </h2>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : history && history.length > 0 ? (
              <ol className="relative border-l border-border ml-3 flex flex-col">
                {history.map((entry, idx) => {
                  const dotColor = STATUS_DOT[entry.status] ?? 'bg-gray-400';
                  return (
                    <li key={entry.id ?? idx} className="ml-4 pb-5 last:pb-0">
                      <span
                        className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-surface ${dotColor}`}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <BookingStatusBadge status={entry.status} size="sm" />
                        {idx === 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                            Most recent
                          </span>
                        )}
                        {entry.changedAt && (
                          <span className="text-xs text-text-muted">{timeAgo(entry.changedAt)}</span>
                        )}
                      </div>
                      {entry.reason && (
                        <p className="text-xs text-text-muted mt-1 italic">
                          &ldquo;{entry.reason}&rdquo;
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-text-muted">No status history available.</p>
            )}
          </div>

          {/* Reviews — completed bookings only */}
          {booking.status === 'completed' && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <span className="text-warning">
                  <StarFilledIcon className="w-4 h-4" />
                </span>
                Reviews
              </h2>

              {bookingReviewsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
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
                    bookingReviews.length < 2 && (
                      <p className="text-sm text-text-muted italic">
                        Waiting for the other party to leave a review.
                      </p>
                    )
                  ) : (
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

          {/* Payment — accepted bookings only */}
          {booking.status === 'accepted' && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <LockIcon />
                Payment
              </h2>

              {paymentVerified ? (
                <div className="flex items-start gap-3 p-4 bg-success-subtle border border-success/30 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-success">Payment confirmed</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Your payment has been received. The transporter will now begin the journey
                      and mark the booking in progress.
                    </p>
                  </div>
                </div>
              ) : !isShipper ? (
                <div className="flex items-start gap-3 p-4 bg-warning-subtle border border-warning/30 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <HourglassIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warning">Awaiting payment</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Waiting for the shipper to complete the payment.
                      {booking.paymentDeadline && (
                        <> Payment is due by {formatDate(booking.paymentDeadline)}.</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-surface-alt rounded-xl p-4 border border-border">
                    <dl className="flex flex-col gap-2.5 text-sm">
                      {booking.agreedPrice != null && (
                        <div className="flex items-center justify-between">
                          <dt className="text-text-muted">Amount Due</dt>
                          <dd className="font-bold text-text text-base">
                            {formatCurrency(booking.agreedPrice)}
                          </dd>
                        </div>
                      )}
                      {booking.platformCommissionPct != null && (
                        <div className="flex items-center justify-between">
                          <dt className="text-text-muted">Platform Fee</dt>
                          <dd className="text-text">{booking.platformCommissionPct}%</dd>
                        </div>
                      )}
                      {booking.paymentDeadline && (
                        <div className="flex items-center justify-between">
                          <dt className="text-text-muted">Pay By</dt>
                          <dd className="text-text font-medium">
                            {formatDate(booking.paymentDeadline)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handlePayNow}
                    isLoading={initiateLoading}
                    disabled={initiateLoading}
                  >
                    <CreditCardIcon />
                    Pay Now
                  </Button>

                  <p className="text-xs text-text-muted text-center">
                    Payments are processed securely via Razorpay. GoodsGo holds funds in
                    escrow until the booking is completed.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Counterparty */}
          {counterparty && (
            <SidebarCard>
              <h3 className="font-semibold text-text text-sm mb-3">{counterpartyLabel}</h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={counterparty.profileImageUrl}
                  name={counterparty.fullName}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text text-sm truncate">{counterparty.fullName}</p>
                  {counterparty.rating != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-warning">
                        <StarFilledIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs text-text-muted">
                        {Number(counterparty.rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </SidebarCard>
          )}

          {/* Linked post */}
          {booking.post && (
            <SidebarCard>
              <h3 className="font-semibold text-text text-sm mb-2">Linked Post</h3>
              <p className="text-sm text-text mb-2">{routeLabel}</p>
              <button
                type="button"
                onClick={() => navigate(`/marketplace/posts/${booking.post.id}`)}
                className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
              >
                View post
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </SidebarCard>
          )}

          {/* Chat shortcut */}
          {booking.conversation?.id && (
            <SidebarCard>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ChatBubbleIcon />
                </span>
                <h3 className="font-semibold text-text text-sm">Chat</h3>
              </div>
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
            </SidebarCard>
          )}
        </div>
      </div>
    </div>
  );
}
