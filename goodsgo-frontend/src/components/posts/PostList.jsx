import PropTypes from 'prop-types';
import PostCard from './PostCard';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';

function BoxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="skeleton w-full h-40 rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
      </div>
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border">
        <div className="skeleton w-6 h-6 rounded-full flex-shrink-0" />
        <div className="skeleton h-3 w-28 rounded-full flex-1" />
      </div>
    </div>
  );
}

export default function PostList({ posts, isLoading, isError, meta, currentPage, onPageChange }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-danger-subtle border border-danger/20 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-text mb-1">Failed to load posts</p>
        <p className="text-sm text-text-muted">Check your connection and refresh the page.</p>
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <EmptyState
        icon={<BoxIcon />}
        title="No posts found"
        message="No posts match your current filters. Try adjusting or clearing them."
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {meta && (
        <Pagination
          currentPage={currentPage ?? 1}
          totalPages={meta.totalPages ?? 1}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

PostList.propTypes = {
  posts: PropTypes.array,
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
  meta: PropTypes.shape({
    totalPages: PropTypes.number,
    total: PropTypes.number,
  }),
  currentPage: PropTypes.number,
  onPageChange: PropTypes.func,
};
