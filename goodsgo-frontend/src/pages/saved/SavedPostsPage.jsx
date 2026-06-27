import { useSavedPosts } from '../../hooks/usePosts';
import PostList from '../../components/posts/PostList';
import EmptyState from '../../components/common/EmptyState';
import { ROUTES } from '../../constants/routes';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

function EmptyBookmarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-12 h-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    </svg>
  );
}

export default function SavedPostsPage() {
  const { data, isLoading, isError } = useSavedPosts();

  const posts = data?.data ?? [];
  const meta = data?.meta ?? null;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-text-muted text-sm">Failed to load saved posts. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-text mb-6">Saved Posts</h1>

      {!isLoading && posts.length === 0 ? (
        <EmptyState
          icon={<EmptyBookmarkIcon />}
          title="No saved posts yet"
          message="Posts you save from the marketplace will appear here."
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
