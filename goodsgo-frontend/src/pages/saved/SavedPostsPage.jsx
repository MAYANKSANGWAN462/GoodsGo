import { Link } from 'react-router-dom';
import { useSavedPosts } from '../../hooks/usePosts';
import PostList from '../../components/posts/PostList';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';

function BookmarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );
}

export default function SavedPostsPage() {
  const { data, isLoading, isError } = useSavedPosts();

  const posts = data?.data ?? [];
  const meta = data?.meta ?? null;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger-subtle border border-danger/20 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-text mb-1">Failed to load saved posts</p>
          <p className="text-sm text-text-muted">Check your connection and refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <BookmarkIcon />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text">Saved Posts</h1>
          {!isLoading && meta && (
            <p className="text-sm text-text-muted mt-0.5">
              {meta.total ?? posts.length} saved {(meta.total ?? posts.length) === 1 ? 'post' : 'posts'}
            </p>
          )}
        </div>
      </div>

      {!isLoading && posts.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon />}
          title="No saved posts yet"
          message="Save posts from the marketplace and they'll appear here for easy access."
          action={
            <Link to={ROUTES.MARKETPLACE}>
              <Button variant="primary" size="sm">Browse marketplace</Button>
            </Link>
          }
        />
      ) : (
        <PostList
          posts={posts}
          isLoading={isLoading}
          isError={isError}
          meta={meta}
        />
      )}
    </div>
  );
}
