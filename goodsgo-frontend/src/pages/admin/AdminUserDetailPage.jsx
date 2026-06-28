import { useState } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';
import { useAdminUser, useSuspendUser, useReactivateUser } from '../../hooks/useAdmin';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import Card from '../../components/common/Card';
import { formatDate } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text text-right">{value ?? '—'}</span>
    </div>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
};

export default function AdminUserDetailPage() {
  const { id: userId }    = useParams();
  const [suspendOpen, setSuspendOpen]       = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [suspendReason, setSuspendReason]   = useState('');

  const { data, isLoading, isError } = useAdminUser(userId);
  const suspendMutation    = useSuspendUser();
  const reactivateMutation = useReactivateUser();

  const user = data?.data ?? null;

  function handleSuspendConfirm() {
    suspendMutation.mutate(
      { userId, reason: suspendReason },
      { onSuccess: () => { setSuspendOpen(false); setSuspendReason(''); } }
    );
  }

  function handleReactivateConfirm() {
    reactivateMutation.mutate(
      userId,
      { onSuccess: () => setReactivateOpen(false) }
    );
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError || !user) return (
    <EmptyState
      title="User not found"
      message="The user may have been deleted or the ID is incorrect."
      action={<Link to={ROUTES.ADMIN_USERS}><Button variant="secondary">Back to Users</Button></Link>}
    />
  );

  const isSuspended = !!user.suspendedAt;

  return (
    <div className="max-w-3xl">
      <Link to={ROUTES.ADMIN_USERS} className="text-sm text-text-muted hover:text-primary flex items-center gap-1 mb-4">
        ← Back to Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar src={user.profileImageUrl} name={user.fullName} size="lg" />
          <div>
            <h1 className="text-xl font-bold text-text">{user.fullName}</h1>
            <p className="text-text-muted text-sm">{user.email}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant={!isSuspended && user.isActive ? 'success' : 'danger'} size="sm">
                {isSuspended ? 'Suspended' : user.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={user.isEmailVerified ? 'success' : 'warning'} size="sm">
                {user.isEmailVerified ? 'Email Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isSuspended ? (
            <Button variant="secondary" size="sm" onClick={() => setReactivateOpen(true)}>
              Reactivate
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>
              Suspend
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md">
          <h2 className="text-sm font-semibold text-text mb-3">Profile</h2>
          <InfoRow label="Phone" value={user.phone} />
          <InfoRow label="City" value={user.city} />
          <InfoRow label="State" value={user.state} />
          <InfoRow label="Rating" value={user.rating ? `${user.rating} ★` : null} />
          <InfoRow label="Member since" value={formatDate(user.createdAt)} />
          <InfoRow label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : null} />
        </Card>

        <Card padding="md">
          <h2 className="text-sm font-semibold text-text mb-3">Activity</h2>
          <InfoRow label="Total posts" value={user.totalPosts} />
          <InfoRow label="Bookings as requester" value={user.totalBookingsAsRequester} />
          <InfoRow label="Bookings as owner" value={user.totalBookingsAsOwner} />
          <InfoRow label="Total reviews" value={user.totalReviews} />
          <InfoRow label="Cancellations" value={user.cancellationCount} />
        </Card>

        {isSuspended && (
          <Card padding="md" className="sm:col-span-2">
            <h2 className="text-sm font-semibold text-danger mb-3">Suspension Details</h2>
            <InfoRow label="Suspended at" value={formatDate(user.suspendedAt)} />
            <InfoRow label="Reason" value={user.suspensionReason} />
          </Card>
        )}
      </div>

      {/* Suspend modal */}
      <Modal
        isOpen={suspendOpen}
        onClose={() => { setSuspendOpen(false); setSuspendReason(''); }}
        title={`Suspend ${user.fullName}?`}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setSuspendOpen(false); setSuspendReason(''); }}
              disabled={suspendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSuspendConfirm}
              isLoading={suspendMutation.isPending}
              disabled={suspendReason.trim().length < 10}
            >
              Suspend User
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted mb-3">
          The user will be blocked from logging in. Provide a reason (minimum 10 characters).
        </p>
        <Input
          id="suspendReasonDetail"
          label="Suspension reason"
          placeholder="e.g. Repeated policy violations…"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        onConfirm={handleReactivateConfirm}
        title={`Reactivate ${user.fullName}?`}
        message="This will restore the user's full access to GoodsGo."
        confirmLabel="Reactivate"
        confirmVariant="primary"
        isLoading={reactivateMutation.isPending}
      />
    </div>
  );
}
