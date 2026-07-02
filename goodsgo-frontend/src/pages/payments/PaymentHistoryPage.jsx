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

function StepDot({ number }) {
  return (
    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shadow-sm">
      {number}
    </span>
  );
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Payments</h1>
          <p className="text-text-muted text-sm mt-0.5">Manage and track your booking payments</p>
        </div>
      </div>

      {/* How payments work */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-text mb-1.5">Secure Escrow Payments</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Payments on GoodsGo are processed securely through Razorpay on a per-booking basis.
              Once a booking is accepted and a price is agreed, pay directly from the Booking Detail page.
              Funds are held in escrow until delivery is confirmed.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-4">
        <h2 className="font-semibold text-text mb-5">How it works</h2>
        <ol className="flex flex-col gap-5">
          {[
            {
              n: 1,
              title: 'Booking is accepted',
              desc: 'The post owner reviews your request and sets an agreed price.',
            },
            {
              n: 2,
              title: 'Pay via secure Razorpay checkout',
              desc: 'Open the Booking Detail and click "Pay Now". Supports UPI, cards, net banking, and wallets.',
            },
            {
              n: 3,
              title: 'Funds held in escrow',
              desc: 'GoodsGo holds the payment securely until the transporter marks the booking complete.',
            },
            {
              n: 4,
              title: 'Payout after completion',
              desc: 'The transporter receives the payout (minus the platform commission) after completion.',
            },
          ].map(({ n, title, desc }) => (
            <li key={n} className="flex items-start gap-4">
              <StepDot number={n} />
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-text">{title}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Commission note */}
      <div className="bg-warning-subtle border border-warning/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-sm text-warning leading-relaxed">
            GoodsGo charges a small platform commission on each completed booking.
            The exact percentage is displayed on the Booking Detail page when payment is initiated.
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
