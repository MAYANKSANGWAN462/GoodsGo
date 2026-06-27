import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../../hooks/useUsers';
import { useMyPosts } from '../../hooks/usePosts';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import PostList from '../../components/posts/PostList';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { ROUTES } from '../../constants/routes';

const TABS = ['My Posts', 'Reviews'];
const POSTS_PER_PAGE = 9;

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('My Posts');
  const [postsPage, setPostsPage] = useState(1);

  const { data: user, isLoading, isError } = useMe();
  const { data: postsData, isLoading: postsLoading, isError: postsError } = useMyPosts({
    page: postsPage,
    limit: POSTS_PER_PAGE,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-text-muted text-sm">Failed to load profile. Please refresh the page.</p>
      </div>
    );
  }

  const posts = postsData?.data ?? [];
  const postsMeta = postsData?.meta ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <ProfileHeader
          user={user}
          isOwnProfile
          onSettingsClick={() => navigate(ROUTES.SETTINGS)}
        />
      </div>

      {/* Stats bar */}
      <ProfileStats
        postCount={user.postCount}
        bookingCount={user.bookingCount}
        reviewCount={user.reviewCount}
        cancellationCount={user.cancellationCount}
      />

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6" aria-label="Profile sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setPostsPage(1);
              }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
              }`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: My Posts */}
      {activeTab === 'My Posts' && (
        <PostList
          posts={posts}
          isLoading={postsLoading}
          isError={postsError}
          meta={postsMeta}
          currentPage={postsPage}
          onPageChange={(p) => {
            setPostsPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Tab: Reviews — placeholder until FE-9 */}
      {activeTab === 'Reviews' && (
        <EmptyState
          icon={<span className="text-4xl">⭐</span>}
          title="No reviews yet"
          message="Reviews from completed bookings will appear here."
        />
      )}
    </div>
  );
}
