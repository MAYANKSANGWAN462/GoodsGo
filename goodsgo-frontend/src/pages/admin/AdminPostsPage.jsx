import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAdminPosts, useHidePost, useRestorePost } from '../../hooks/useAdmin';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Select from '../../components/common/Select';
import PostTypeBadge from '../../components/posts/PostTypeBadge';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: '',         label: 'All Statuses' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'booked',   label: 'Booked' },
  { value: 'hidden',   label: 'Hidden' },
  { value: 'expired',  label: 'Expired' },
];

const REPORTED_OPTIONS = [
  { value: '',     label: 'All Posts' },
  { value: 'true', label: 'Reported Only' },
];

function PostRow({ post, onHide, onRestore }) {
  const isHidden = post.status === 'hidden';
  return (
    <tr className="border-b border-border hover:bg-surface-alt transition-colors">
      <td className="py-3 px-4">
        <p className="font-medium text-text text-sm line-clamp-1 max-w-xs">{post.title ?? post.postType}</p>
        <p className="text-xs text-text-muted">{post.originCity} → {post.destinationCity}</p>
      </td>
      <td className="py-3 px-4">
        <PostTypeBadge type={post.postType} />
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{post.ownerName ?? post.ownerId}</td>
      <td className="py-3 px-4">
        <Badge
          variant={
            post.status === 'active' ? 'success' :
            post.status === 'hidden' ? 'danger' :
            post.status === 'booked' ? 'info' :
            'neutral'
          }
          size="sm"
        >
          {post.status}
        </Badge>
        {post.reportCount > 0 && (
          <Badge variant="warning" size="sm" className="ml-1">
            {post.reportCount} report{post.reportCount > 1 ? 's' : ''}
          </Badge>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{formatDate(post.createdAt)}</td>
      <td className="py-3 px-4">
        {isHidden ? (
          <Button size="sm" variant="secondary" onClick={() => onRestore(post)}>
            Restore
          </Button>
        ) : (
          <Button size="sm" variant="danger" onClick={() => onHide(post)}>
            Hide
          </Button>
        )}
      </td>
    </tr>
  );
}

PostRow.propTypes = {
  post:      PropTypes.object.isRequired,
  onHide:    PropTypes.func.isRequired,
  onRestore: PropTypes.func.isRequired,
};

export default function AdminPostsPage() {
  const [status, setStatus]     = useState('');
  const [reported, setReported] = useState('');
  const [page, setPage]         = useState(1);
  const [hideTarget, setHideTarget]       = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const filters = {
    status:   status || undefined,
    reported: reported || undefined,
    page,
    limit:    20,
  };

  const { data, isLoading, isError } = useAdminPosts(filters);
  const hideMutation    = useHidePost();
  const restoreMutation = useRestorePost();

  const posts      = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Post Moderation</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="sm:w-48">
          <Select
            id="postStatus"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <div className="sm:w-48">
          <Select
            id="reported"
            options={REPORTED_OPTIONS}
            value={reported}
            onChange={(e) => { setReported(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <EmptyState title="Failed to load posts" message="Please try refreshing the page." />
      ) : posts.length === 0 ? (
        <EmptyState title="No posts found" message="Try adjusting your filters." />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="py-3 px-4">Post</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  onHide={setHideTarget}
                  onRestore={setRestoreTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        isOpen={!!hideTarget}
        onClose={() => setHideTarget(null)}
        onConfirm={() => hideMutation.mutate(hideTarget.id, { onSuccess: () => setHideTarget(null) })}
        title="Hide this post?"
        message="The post will be hidden from the public marketplace. The owner can still see it."
        confirmLabel="Hide Post"
        confirmVariant="danger"
        isLoading={hideMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => restoreMutation.mutate(restoreTarget.id, { onSuccess: () => setRestoreTarget(null) })}
        title="Restore this post?"
        message="The post will be visible in the marketplace again."
        confirmLabel="Restore"
        confirmVariant="primary"
        isLoading={restoreMutation.isPending}
      />
    </div>
  );
}
