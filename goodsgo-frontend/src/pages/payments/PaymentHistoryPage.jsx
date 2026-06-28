import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import Button from '../../components/common/Button';

/**
 * PaymentHistoryPage
 *
 * No dedicated GET /payments list endpoint exists in the backend.
 * Payment records are tied to individual bookings and accessed via
 * GET /bookings/:id. This page explains the payment flow and directs
 * the user to their Bookings page for payment status.
 */
export default function PaymentHistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Payments</h1>
        <p className="text-text-muted text-sm mt-1">
          Manage and track your booking payments
        </p>
      </div>

      {/* How payments work */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-4">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">💳</span>
          <div>
            <h2 className="font-semibold text-text mb-1">How Payments Work</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Payments on GoodsGo are processed securely through Razorpay on a
              per-booking basis. Once a post owner accepts your booking request and
              you agree on a price, a payment link becomes available on the
              Booking Detail page.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-4">
        <h2 className="font-semibold text-text mb-4">Payment Steps</h2>
        <ol className="flex flex-col gap-4">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-text">Booking is accepted</p>
              <p className="text-xs text-text-muted mt-0.5">
                The post owner reviews your request and sets an agreed price.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              2
            </span>
            <div>
              <p className="text-sm font-medium text-text">Pay via secure Razorpay checkout</p>
              <p className="text-xs text-text-muted mt-0.5">
                Open the Booking Detail page and click "Pay Now". Razorpay supports
                UPI, cards, net banking, and wallets.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              3
            </span>
            <div>
              <p className="text-sm font-medium text-text">Funds held in escrow</p>
              <p className="text-xs text-text-muted mt-0.5">
                GoodsGo holds the payment securely until the booking is marked
                complete by the transporter.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              4
            </span>
            <div>
              <p className="text-sm font-medium text-text">Payout after completion</p>
              <p className="text-xs text-text-muted mt-0.5">
                The transporter receives the payout (minus the platform commission)
                after the booking is marked complete.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Commission note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">ℹ️</span>
          <p className="text-sm text-amber-800">
            GoodsGo charges a small platform commission on each completed booking.
            The exact percentage is shown on the Booking Detail page when payment is
            initiated.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          onClick={() => navigate(ROUTES.BOOKINGS)}
          fullWidth
        >
          View My Bookings
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(ROUTES.MARKETPLACE)}
          fullWidth
        >
          Browse Marketplace
        </Button>
      </div>
    </div>
  );
}
