import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import BookingList from '../../components/bookings/BookingList';
import Button from '../../components/common/Button';
import { useBookings } from '../../hooks/useBookings';

/**
 * Tabbed bookings list page.
 * URL param ?role=requester (default) | owner switches between the two views.
 */
export default function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const role = searchParams.get('role') || 'requester';
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBookings({ role, page, limit: 10 });
  const bookings = data?.data ?? [];
  const meta = data?.meta ?? null;

  function switchRole(newRole) {
    setPage(1);
    setSearchParams({ role: newRole });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-6">My Bookings</h1>

      {/* Role tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={role === 'requester' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => switchRole('requester')}
        >
          As Requester
        </Button>
        <Button
          variant={role === 'owner' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => switchRole('owner')}
        >
          As Post Owner
        </Button>
      </div>

      <BookingList
        bookings={bookings}
        meta={meta}
        isLoading={isLoading}
        currentUserId={user?.id}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
}
