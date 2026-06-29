import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PropTypes from 'prop-types';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { ELIGIBLE_ACTIONS } from '../../constants/bookingStatuses';
import RazorpayCheckoutButton from './RazorpayCheckoutButton';
import {
  useAcceptBooking,
  useRejectBooking,
  useWithdrawBooking,
  useCancelBooking,
  useMarkInProgress,
  useCompleteBooking,
  useDisputeBooking,
} from '../../hooks/useBookings';

const acceptSchema = yup.object({
  agreedPrice: yup
    .number()
    .typeError('Enter a valid price')
    .min(1, 'Price must be at least ₹1')
    .required('Agreed price is required'),
});

const cancelSchema = yup.object({
  reason: yup
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .required('Reason is required'),
});

const disputeSchema = yup.object({
  reason: yup.string().required('Reason is required'),
  description: yup
    .string()
    .min(10, 'Please provide at least 10 characters')
    .required('Description is required'),
});

const rejectSchema = yup.object({ reason: yup.string() });

/**
 * Renders context-sensitive action buttons for a booking.
 * Only buttons valid for the current user's role and the booking's current status are shown.
 */
export default function BookingActionButtons({ booking, currentUserId }) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [markInProgressOpen, setMarkInProgressOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  // All four form instances are called unconditionally (no conditional hooks).
  const acceptForm = useForm({ resolver: yupResolver(acceptSchema) });
  const cancelForm = useForm({ resolver: yupResolver(cancelSchema) });
  const disputeForm = useForm({ resolver: yupResolver(disputeSchema) });
  const rejectForm = useForm({ resolver: yupResolver(rejectSchema) });

  const acceptMutation = useAcceptBooking(booking.id);
  const rejectMutation = useRejectBooking(booking.id);
  const withdrawMutation = useWithdrawBooking(booking.id);
  const cancelMutation = useCancelBooking(booking.id);
  const markInProgressMutation = useMarkInProgress(booking.id);
  const completeMutation = useCompleteBooking(booking.id);
  const disputeMutation = useDisputeBooking(booking.id);

  const isOwner = booking.postOwner?.id === currentUserId;
  const role = isOwner ? 'owner' : 'requester';
  const eligible = ELIGIBLE_ACTIONS[booking.status]?.[role] ?? [];

  if (eligible.length === 0) return null;

  function handleAccept(values) {
    acceptMutation.mutate(
      { agreedPrice: Number(values.agreedPrice) },
      {
        onSuccess: () => {
          setAcceptOpen(false);
          acceptForm.reset();
        },
      }
    );
  }

  function handleReject(values) {
    rejectMutation.mutate(
      { reason: values.reason || undefined },
      {
        onSuccess: () => {
          setRejectOpen(false);
          rejectForm.reset();
        },
      }
    );
  }

  function handleCancel(values) {
    cancelMutation.mutate(
      { reason: values.reason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          cancelForm.reset();
        },
      }
    );
  }

  function handleDispute(values) {
    disputeMutation.mutate(
      { reason: values.reason, description: values.description },
      {
        onSuccess: () => {
          setDisputeOpen(false);
          disputeForm.reset();
        },
      }
    );
  }

  return (
    <>
      <div className="bg-surface rounded-xl border border-border p-4 flex flex-wrap gap-2">
        {eligible.includes('pay') && (
          <RazorpayCheckoutButton
            bookingId={booking.id}
            displayAmount={booking.agreedPrice}
          />
        )}
        {eligible.includes('accept') && (
          <Button size="sm" onClick={() => setAcceptOpen(true)}>
            Accept
          </Button>
        )}
        {eligible.includes('reject') && (
          <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        )}
        {eligible.includes('withdraw') && (
          <Button variant="secondary" size="sm" onClick={() => setWithdrawOpen(true)}>
            Withdraw Request
          </Button>
        )}
        {eligible.includes('mark_in_progress') && (
          <Button size="sm" onClick={() => setMarkInProgressOpen(true)}>
            Mark In Progress
          </Button>
        )}
        {eligible.includes('complete') && (
          <Button size="sm" onClick={() => setCompleteOpen(true)}>
            Mark Complete
          </Button>
        )}
        {eligible.includes('cancel') && (
          <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
            Cancel Booking
          </Button>
        )}
        {eligible.includes('dispute') && (
          <Button variant="secondary" size="sm" onClick={() => setDisputeOpen(true)}>
            File Dispute
          </Button>
        )}
      </div>

      {/* ── Accept Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={acceptOpen}
        onClose={() => { setAcceptOpen(false); acceptForm.reset(); }}
        title="Accept Booking"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAcceptOpen(false); acceptForm.reset(); }}>
              Cancel
            </Button>
            <Button
              onClick={acceptForm.handleSubmit(handleAccept)}
              isLoading={acceptMutation.isPending}
            >
              Accept
            </Button>
          </>
        }
      >
        <form onSubmit={acceptForm.handleSubmit(handleAccept)} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Set the agreed price for this booking. The requester will be notified.
          </p>
          <Input
            label="Agreed Price (₹) *"
            id="agreedPrice"
            type="number"
            min="1"
            placeholder="e.g. 5000"
            error={acceptForm.formState.errors.agreedPrice?.message}
            {...acceptForm.register('agreedPrice')}
          />
        </form>
      </Modal>

      {/* ── Reject Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={rejectOpen}
        onClose={() => { setRejectOpen(false); rejectForm.reset(); }}
        title="Reject Booking"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectOpen(false); rejectForm.reset(); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={rejectForm.handleSubmit(handleReject)}
              isLoading={rejectMutation.isPending}
            >
              Reject
            </Button>
          </>
        }
      >
        <form onSubmit={rejectForm.handleSubmit(handleReject)} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            You are about to reject this booking request. The requester will be notified.
          </p>
          <Textarea
            label="Reason (optional)"
            id="rejectReason"
            rows={3}
            placeholder="Let the requester know why you are rejecting their request..."
            {...rejectForm.register('reason')}
          />
        </form>
      </Modal>

      {/* ── Cancel Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); cancelForm.reset(); }}
        title="Cancel Booking"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCancelOpen(false); cancelForm.reset(); }}>
              Keep Booking
            </Button>
            <Button
              variant="danger"
              onClick={cancelForm.handleSubmit(handleCancel)}
              isLoading={cancelMutation.isPending}
            >
              Cancel Booking
            </Button>
          </>
        }
      >
        <form onSubmit={cancelForm.handleSubmit(handleCancel)} className="flex flex-col gap-4">
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Warning: Cancelling will increment your cancellation counter. Repeated cancellations may
            affect your standing on the platform.
          </p>
          <Textarea
            label="Reason for cancellation *"
            id="cancelReason"
            rows={3}
            placeholder="Please explain why you are cancelling..."
            error={cancelForm.formState.errors.reason?.message}
            {...cancelForm.register('reason')}
          />
        </form>
      </Modal>

      {/* ── Withdraw ConfirmDialog ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onConfirm={() =>
          withdrawMutation.mutate(undefined, { onSuccess: () => setWithdrawOpen(false) })
        }
        title="Withdraw Booking Request?"
        message="This will cancel your pending booking request. You can make a new request if you change your mind."
        confirmLabel="Withdraw"
        isLoading={withdrawMutation.isPending}
      />

      {/* ── Mark In Progress ConfirmDialog ────────────────────────────── */}
      <ConfirmDialog
        isOpen={markInProgressOpen}
        onClose={() => setMarkInProgressOpen(false)}
        onConfirm={() =>
          markInProgressMutation.mutate(undefined, {
            onSuccess: () => setMarkInProgressOpen(false),
          })
        }
        title="Mark Booking as In Progress?"
        message="This confirms the transport has started. The requester will be notified."
        confirmLabel="Mark In Progress"
        confirmVariant="primary"
        isLoading={markInProgressMutation.isPending}
      />

      {/* ── Complete ConfirmDialog ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={() =>
          completeMutation.mutate(undefined, { onSuccess: () => setCompleteOpen(false) })
        }
        title="Mark Booking as Completed?"
        message="This confirms the transport is complete. Both parties can leave reviews after this."
        confirmLabel="Mark Complete"
        confirmVariant="primary"
        isLoading={completeMutation.isPending}
      />

      {/* ── Dispute Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={disputeOpen}
        onClose={() => { setDisputeOpen(false); disputeForm.reset(); }}
        title="File a Dispute"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDisputeOpen(false); disputeForm.reset(); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={disputeForm.handleSubmit(handleDispute)}
              isLoading={disputeMutation.isPending}
            >
              File Dispute
            </Button>
          </>
        }
      >
        <form onSubmit={disputeForm.handleSubmit(handleDispute)} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Filing a dispute will freeze the booking and notify our team. Please provide as much
            detail as possible.
          </p>
          <Input
            label="Reason *"
            id="disputeReason"
            placeholder="Brief summary of the issue"
            error={disputeForm.formState.errors.reason?.message}
            {...disputeForm.register('reason')}
          />
          <Textarea
            label="Description *"
            id="disputeDescription"
            rows={4}
            placeholder="Describe the issue in detail..."
            error={disputeForm.formState.errors.description?.message}
            {...disputeForm.register('description')}
          />
        </form>
      </Modal>
    </>
  );
}

BookingActionButtons.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    postOwner: PropTypes.shape({ id: PropTypes.string }),
  }).isRequired,
  currentUserId: PropTypes.string,
};
