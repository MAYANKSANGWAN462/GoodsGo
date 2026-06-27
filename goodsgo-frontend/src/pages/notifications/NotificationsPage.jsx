import { useState } from 'react';
import { useNotifications, useMarkOneRead, useMarkAllRead } from '../../hooks/useNotifications';
import NotificationItem from '../../components/notifications/NotificationItem';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';

const PAGE_LIMIT = 20;

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useNotifications({ page, limit: PAGE_LIMIT });
  const markOneMutation = useMarkOneRead();
  const markAllMutation = useMarkAllRead();

  const notifications = data?.data ?? [];
  const meta = data?.meta ?? {};
  const hasUnread = notifications.some((n) => !n.isRead);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-text-muted text-sm">
          Failed to load notifications. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Notifications</h1>
        {hasUnread && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🔔</span>}
          title="You're all caught up"
          message="No notifications yet. We'll let you know when something happens."
        />
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm divide-y divide-border">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={(id) => markOneMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}
    </div>
  );
}
