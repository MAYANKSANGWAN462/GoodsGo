import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuthStore from '../../stores/useAuthStore';
import BookingList from '../../components/bookings/BookingList';
import EmptyState from '../../components/common/EmptyState';
import { useBookings } from '../../hooks/useBookings';

function ClipboardListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" />
    </svg>
  );
}

function StatCard({ dotColor, label, count }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3">
      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
      <div>
        <p className="text-xs text-text-muted leading-none mb-1">{label}</p>
        <p className="text-xl font-bold text-text leading-none">{count}</p>
      </div>
    </div>
  );
}

StatCard.propTypes = {
  dotColor: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
};

export default function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const role = searchParams.get('role') || 'requester';
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBookings({ role, page, limit: 10 });
  const bookings = data?.data ?? [];
  const meta = data?.meta ?? null;

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const acceptedCount = bookings.filter(
    (b) => b.status === 'accepted' || b.status === 'in_progress'
  ).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  function switchRole(newRole) {
    setPage(1);
    setSearchParams({ role: newRole });
  }

  const showEmptyHint = !isLoading && bookings.length === 0;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="mt-0.5 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <ClipboardListIcon />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text">My Bookings</h1>
          <p className="text-sm text-text-muted mt-0.5">Manage your transport bookings</p>
        </div>
      </div>

      {/* Status summary — visible only when items are loaded and list is non-empty */}
      {!isLoading && bookings.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard dotColor="bg-amber-400" label="Pending" count={pendingCount} />
          <StatCard dotColor="bg-green-500" label="Active" count={acceptedCount} />
          <StatCard dotColor="bg-blue-500" label="Completed" count={completedCount} />
        </div>
      )}

      {/* Role pill switcher */}
      <div className="inline-flex bg-surface-alt border border-border rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => switchRole('requester')}
          className={[
            'px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            role === 'requester'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
        >
          As Requester
        </button>
        <button
          type="button"
          onClick={() => switchRole('owner')}
          className={[
            'px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            role === 'owner'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
        >
          As Post Owner
        </button>
      </div>

      {/* Booking list or context-aware empty state */}
      {showEmptyHint ? (
        <EmptyState
          title={role === 'owner' ? 'No booking requests yet' : 'No bookings yet'}
          message={
            role === 'owner'
              ? 'No one has requested a booking on your posts yet. Create a post to get started.'
              : "You haven't made any booking requests yet. Browse the marketplace to find transport opportunities."
          }
        />
      ) : (
        <BookingList
          bookings={bookings}
          meta={meta}
          isLoading={isLoading}
          currentUserId={user?.id}
          onPageChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}
