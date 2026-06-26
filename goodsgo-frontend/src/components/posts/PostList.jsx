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
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden animate-pulse">
      <div className="w-full h-40 bg-gray-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-gray-200 rounded-full w-24" />
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full w-1/3" />
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-danger font-medium mb-2">Failed to load posts.</p>
        <p className="text-text-muted text-sm">Please check your connection and try again.</p>
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
