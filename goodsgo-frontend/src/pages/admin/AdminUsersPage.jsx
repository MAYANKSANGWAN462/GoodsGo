import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useAdminUsers, useSuspendUser, useReactivateUser } from '../../hooks/useAdmin';
import { useDebounce } from '../../hooks/useDebounce';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Avatar from '../../components/common/Avatar';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: '',      label: 'All Users' },
  { value: 'true',  label: 'Active' },
  { value: 'false', label: 'Suspended / Inactive' },
];

function UserRow({ user, onSuspend, onReactivate }) {
  const isSuspended = !!user.suspendedAt;
  return (
    <tr className="border-b border-border hover:bg-surface-alt transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar src={user.profileImageUrl} name={user.fullName} size="sm" />
          <div>
            <Link
              to={`/admin/users/${user.id}`}
              className="font-medium text-text hover:text-primary text-sm"
            >
              {user.fullName}
            </Link>
            <p className="text-xs text-text-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{user.city || '—'}</td>
      <td className="py-3 px-4">
        <Badge variant={!isSuspended && user.isActive ? 'success' : 'danger'} size="sm">
          {isSuspended ? 'Suspended' : user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge variant={user.isEmailVerified ? 'success' : 'warning'} size="sm">
          {user.isEmailVerified ? 'Verified' : 'Unverified'}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{formatDate(user.createdAt)}</td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {isSuspended ? (
            <Button size="sm" variant="secondary" onClick={() => onReactivate(user)}>
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => onSuspend(user)}>
              Suspend
            </Button>
          )}
          <Link to={`/admin/users/${user.id}`}>
            <Button size="sm" variant="ghost">View</Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

UserRow.propTypes = {
  user:         PropTypes.object.isRequired,
  onSuspend:    PropTypes.func.isRequired,
  onReactivate: PropTypes.func.isRequired,
};

export default function AdminUsersPage() {
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [page, setPage]           = useState(1);
  const [suspendTarget, setSuspendTarget]       = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [suspendReason, setSuspendReason]       = useState('');

  const debouncedSearch = useDebounce(search, 400);

  const filters = {
    q:         debouncedSearch || undefined,
    is_active: status !== '' ? status : undefined,
    page,
    limit:     20,
  };

  const { data, isLoading, isError } = useAdminUsers(filters);
  const suspendMutation    = useSuspendUser();
  const reactivateMutation = useReactivateUser();

  const users      = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  function handleSuspendConfirm() {
    if (!suspendTarget) return;
    suspendMutation.mutate(
      { userId: suspendTarget.id, reason: suspendReason },
      { onSuccess: () => { setSuspendTarget(null); setSuspendReason(''); } }
    );
  }

  function handleReactivateConfirm() {
    if (!reactivateTarget) return;
    reactivateMutation.mutate(
      reactivateTarget.id,
      { onSuccess: () => setReactivateTarget(null) }
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">User Management</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            id="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="sm:w-48">
          <Select
            id="status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <EmptyState title="Failed to load users" message="Please try refreshing the page." />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="Try adjusting your search or filters." />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onSuspend={setSuspendTarget}
                  onReactivate={setReactivateTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Suspend modal (needs reason input — use Modal, not ConfirmDialog) */}
      <Modal
        isOpen={!!suspendTarget}
        onClose={() => { setSuspendTarget(null); setSuspendReason(''); }}
        title={`Suspend ${suspendTarget?.fullName ?? 'user'}?`}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setSuspendTarget(null); setSuspendReason(''); }}
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
          id="suspendReason"
          label="Suspension reason"
          placeholder="e.g. Repeated policy violations…"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
        />
      </Modal>

      {/* Reactivate dialog */}
      <ConfirmDialog
        isOpen={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        onConfirm={handleReactivateConfirm}
        title={`Reactivate ${reactivateTarget?.fullName ?? 'user'}?`}
        message="This will restore the user's access to the platform."
        confirmLabel="Reactivate"
        confirmVariant="primary"
        isLoading={reactivateMutation.isPending}
      />
    </div>
  );
}
