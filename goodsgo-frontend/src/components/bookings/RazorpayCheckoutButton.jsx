import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import { useInitiatePayment, useVerifyPayment } from '../../hooks/usePayments';

function loadCheckoutScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-js')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Renders a "Pay Now" button for an accepted booking.
 * On click: creates a Razorpay order via the backend, opens the Razorpay
 * checkout modal, then verifies the signature on success.
 *
 * @param {string}  props.bookingId      UUID of the booking to pay for
 * @param {number}  props.displayAmount  Agreed price in INR — shown on the button label
 * @param {object}  [props.prefill]      Optional { name, email, contact } to prefill the modal
 */
export default function RazorpayCheckoutButton({ bookingId, displayAmount, prefill }) {
  const initiateMutation = useInitiatePayment();
  const verifyMutation   = useVerifyPayment();

  const isPending = initiateMutation.isPending || verifyMutation.isPending;

  async function handlePayNow() {
    const loaded = await loadCheckoutScript();
    if (!loaded) {
      toast.error('Could not load payment gateway. Check your internet connection and try again.');
      return;
    }

    initiateMutation.mutate(bookingId, {
      onSuccess: (response) => {
        const { orderId, amount, currency, key } = response.data;

        const options = {
          key,
          amount,
          currency,
          order_id: orderId,
          name: 'GoodsGo',
          description: 'Transport Booking Payment',
          prefill: prefill || {},
          theme: { color: '#2563eb' },

          handler: function (paymentResponse) {
            verifyMutation.mutate({
              bookingId,
              orderId:   paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
            });
          },

          modal: {
            ondismiss: function () {
              toast('Payment cancelled.', { icon: 'ℹ️' });
            },
          },
        };

        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', function (response) {
          const description = response.error?.description || 'An unknown error occurred.';
          toast.error(`Payment failed: ${description}`);
        });

        rzp.open();
      },
    });
  }

  return (
    <Button onClick={handlePayNow} isLoading={isPending} disabled={isPending}>
      {verifyMutation.isPending ? 'Verifying payment…' : `Pay ₹${displayAmount}`}
    </Button>
  );
}

RazorpayCheckoutButton.propTypes = {
  bookingId:     PropTypes.string.isRequired,
  displayAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  prefill: PropTypes.shape({
    name:    PropTypes.string,
    email:   PropTypes.string,
    contact: PropTypes.string,
  }),
};
