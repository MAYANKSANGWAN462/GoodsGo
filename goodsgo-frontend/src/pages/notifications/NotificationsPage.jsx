import { useState } from 'react';
import { useNotifications, useMarkOneRead, useMarkAllRead } from '../../hooks/useNotifications';
import NotificationItem from '../../components/notifications/NotificationItem';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

const PAGE_LIMIT = 20;

/**
 * Groups a flat notifications array into date-labelled buckets.
 * @param {Array} notifications
 * @returns {Array<{label: string, items: Array}>}
 */
function groupByDate(notifications) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday - 86400000);
  const startOfWeek = new Date(startOfToday - 6 * 86400000);

  const buckets = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d >= startOfToday) buckets['Today'].push(n);
    else if (d >= startOfYesterday) buckets['Yesterday'].push(n);
    else if (d >= startOfWeek) buckets['This week'].push(n);
    else buckets['Earlier'].push(n);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function MarkAllReadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10 text-text-subtle"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 px-4 py-4 border-b border-border last:border-0">
      <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="skeleton h-3.5 w-2/3 rounded" />
        <div className="skeleton h-2.5 w-full rounded" />
        <div className="skeleton h-2 w-20 rounded" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, isError } = useNotifications({ page, limit: PAGE_LIMIT });
  const markOneMutation = useMarkOneRead();
  const markAllMutation = useMarkAllRead();

  const allNotifications = data?.data ?? [];
  const meta = data?.meta ?? {};
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  const visibleNotifications =
    activeTab === 'unread' ? allNotifications.filter((n) => !n.isRead) : allNotifications;

  const groups = groupByDate(visibleNotifications);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-7 w-40 rounded" />
          <div className="skeleton h-8 w-28 rounded-lg" />
        </div>
        <div className="skeleton h-10 w-full rounded-xl mb-4" />
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        <h1 className="text-xl font-bold text-text mb-6">Notifications</h1>
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-danger-subtle flex items-center justify-center mx-auto mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-text mb-1">Failed to load notifications</p>
          <p className="text-xs text-text-muted">Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-text">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-white text-xs font-bold leading-none py-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* Desktop: text button */}
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            title="Mark all as read"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted border border-border hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <MarkAllReadIcon />
            <span>Mark all read</span>
          </button>
        )}
        {/* Mobile: icon-only button */}
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            title="Mark all as read"
            className="sm:hidden p-2 rounded-lg text-text-muted border border-border hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            aria-label="Mark all as read"
          >
            <MarkAllReadIcon />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-alt border border-border rounded-xl mb-5">
        {[
          { key: 'all', label: 'All', count: allNotifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === tab.key
                ? 'bg-surface text-text shadow-sm border border-border'
                : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                  activeTab === tab.key && tab.key === 'unread'
                    ? 'bg-primary text-white'
                    : activeTab === tab.key
                    ? 'bg-surface-alt text-text-muted'
                    : 'bg-border text-text-muted',
                ].join(' ')}
              >
                {tab.count > 9 ? '9+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {visibleNotifications.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-4">
            <BellIcon />
          </div>
          <p className="text-base font-semibold text-text mb-1">
            {activeTab === 'unread' ? "You're all caught up!" : 'No notifications yet'}
          </p>
          <p className="text-sm text-text-muted">
            {activeTab === 'unread'
              ? 'No unread notifications right now.'
              : "We'll let you know when something happens."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
                  {label}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Notification cards */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm divide-y divide-border">
                {items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={(id) => markOneMutation.mutate(id)}
                  />
                ))}
              </div>
            </div>
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
