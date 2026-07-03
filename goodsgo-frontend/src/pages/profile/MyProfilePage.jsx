import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../../hooks/useUsers';
import { useMyPosts } from '../../hooks/usePosts';
import { useMyReviews } from '../../hooks/useReviews';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import PostList from '../../components/posts/PostList';
import ReviewList from '../../components/reviews/ReviewList';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes';

const TABS = [
  {
    id: 'My Posts',
    label: 'My Posts',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'Reviews',
    label: 'Reviews',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
];

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
  const { data: myReviewsData, isLoading: myReviewsLoading } = useMyReviews();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Profile header skeleton */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="skeleton h-2 w-full rounded-none" />
          <div className="p-6 flex flex-col sm:flex-row items-start gap-5">
            <div className="skeleton w-20 h-20 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="skeleton h-6 w-44 rounded-full" />
              <div className="skeleton h-4 w-28 rounded-full" />
              <div className="skeleton h-3 w-36 rounded-full" />
            </div>
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="skeleton h-7 w-10 rounded mx-auto mb-2" />
              <div className="skeleton h-3 w-14 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-danger-subtle border border-danger/20 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-text mb-1">Failed to load profile</p>
        <p className="text-sm text-text-muted">Please refresh the page.</p>
      </div>
    );
  }

  const posts = postsData?.data ?? [];
  const postsMeta = postsData?.meta ?? null;
  const myReviews = myReviewsData?.data ?? [];
  const myReviewsMeta = myReviewsData?.meta ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Profile header card with subtle gradient accent */}
      <div
        className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden"
      >
        {/* Cover accent bar */}
        <div
          className="h-2 w-full"
          style={{ background: 'linear-gradient(90deg, #D31905, #FF6B35, #003082)' }}
        />
        <div className="p-6">
          <ProfileHeader
            user={user}
            isOwnProfile
            onSettingsClick={() => navigate(ROUTES.SETTINGS)}
          />
        </div>
      </div>

      {/* Stats bar */}
      <ProfileStats
        postCount={user.postCount}
        bookingCount={user.bookingCount}
        reviewCount={user.reviewCount}
        cancellationCount={user.cancellationCount}
      />

      {/* Quick actions row */}
      <div className="flex gap-3 flex-wrap">
        <Button
          size="sm"
          onClick={() => navigate(ROUTES.CREATE_POST)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Post
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(ROUTES.SETTINGS)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(ROUTES.BOOKINGS)}
        >
          My Bookings
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-0" aria-label="Profile sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPostsPage(1);
              }}
              className={`flex items-center gap-2 px-4 pb-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border-strong'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: My Posts */}
      {activeTab === 'My Posts' && (
        <div className="animate-fade-in">
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
        </div>
      )}

      {/* Tab: Reviews */}
      {activeTab === 'Reviews' && (
        <div className="animate-fade-in">
          <ReviewList
            reviews={myReviews}
            isLoading={myReviewsLoading}
            meta={myReviewsMeta}
            currentPage={1}
            onPageChange={() => {}}
            showRoleBadge
            allowDelete
            emptyTitle="No reviews yet"
            emptyMessage="You haven't written any reviews yet. Reviews appear here after completing a booking."
          />
        </div>
      )}
    </div>
  );
}
