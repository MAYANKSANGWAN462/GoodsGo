import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePost, useToggleSave, useReportPost } from '../../hooks/usePosts';
import useAuthStore from '../../stores/useAuthStore';
import PostImageGallery from '../../components/posts/PostImageGallery';
import PostTypeBadge from '../../components/posts/PostTypeBadge';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import BookingRequestModal from '../../components/bookings/BookingRequestModal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraudulent', label: 'Fraudulent / Misleading' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'wrong_category', label: 'Wrong Category' },
  { value: 'other', label: 'Other' },
];

export default function PostDetailPage() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const { data: post, isLoading, isError } = usePost(postId);
  const toggleSaveMutation = useToggleSave(postId);
  const reportMutation = useReportPost();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-semibold text-text mb-2">Post not found</p>
        <p className="text-text-muted text-sm mb-6">
          This post may have been removed or is no longer available.
        </p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.MARKETPLACE)}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const isOwner = isAuthenticated && user?.id === post.owner?.id;

  function handleReport() {
    if (!reportReason) {
      toast.error('Please select a reason.');
      return;
    }
    reportMutation.mutate(
      { postId, body: { reason: reportReason, description: reportDesc || undefined } },
      {
        onSuccess: () => {
          setReportOpen(false);
          setReportReason('');
          setReportDesc('');
        },
      }
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-text-muted text-sm mb-4 hover:text-primary transition-colors"
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: gallery + details ─────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <PostImageGallery images={post.images ?? []} />

          {/* Type + price + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <PostTypeBadge type={post.postType} size="md" />
            {post.priceEstimate != null && (
              <span className="text-lg font-bold text-primary">
                {formatCurrency(post.priceEstimate)}
              </span>
            )}
            <span
              className={[
                'text-xs px-2 py-0.5 rounded-full font-medium',
                post.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
              ].join(' ')}
            >
              {post.status}
            </span>
          </div>

          {/* Route */}
          <div>
            <p className="text-xl font-semibold text-text">
              {post.originCity ?? '—'}
              {post.destinationCity && (
                <>
                  <span className="mx-2 text-text-muted">→</span>
                  {post.destinationCity}
                </>
              )}
            </p>
            {post.scheduledDate && (
              <p className="text-text-muted text-sm mt-1">
                Scheduled: {formatDate(post.scheduledDate)}
              </p>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <div>
              <h3 className="font-medium text-text mb-1">Description</h3>
              <p className="text-text-muted text-sm whitespace-pre-wrap leading-relaxed">
                {post.description}
              </p>
            </div>
          )}

          {/* Type-specific details */}
          <div className="grid grid-cols-2 gap-3">
            {post.vehicleType && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Vehicle Type</p>
                <p className="text-sm font-medium text-text">
                  {post.vehicleType?.name ?? post.vehicleType}
                </p>
              </div>
            )}
            {post.goodsCategory && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Goods Category</p>
                <p className="text-sm font-medium text-text">
                  {post.goodsCategory?.name ?? post.goodsCategory}
                </p>
              </div>
            )}
            {post.weightKg != null && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Weight</p>
                <p className="text-sm font-medium text-text">{post.weightKg} kg</p>
              </div>
            )}
            {post.availableWeightKg != null && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Available Capacity</p>
                <p className="text-sm font-medium text-text">{post.availableWeightKg} kg</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: owner card + action buttons ──────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Owner info */}
          {post.owner && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="font-semibold text-text mb-3 text-sm">Posted by</h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={post.owner.profileImageUrl}
                  name={post.owner.fullName}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-medium text-text text-sm truncate">{post.owner.fullName}</p>
                  {post.owner.rating != null && (
                    <p className="text-xs text-text-muted mt-0.5">
                      ⭐ {Number(post.owner.rating).toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons — authenticated, not owner */}
          {!isOwner && isAuthenticated && (
            <div className="flex flex-col gap-2">
              {post.status === 'active' && (
                <Button
                  fullWidth
                  onClick={() => setBookingModalOpen(true)}
                >
                  Request Booking
                </Button>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() => toggleSaveMutation.mutate()}
                isLoading={toggleSaveMutation.isPending}
              >
                {post.isSaved ? '★ Saved' : '☆ Save Post'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setReportOpen(true)}
              >
                Report Post
              </Button>
            </div>
          )}

          {/* Prompt for unauthenticated visitors */}
          {!isAuthenticated && (
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-sm text-text-muted mb-3">
                Log in to save or request a booking.
              </p>
              <Button fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
                Log In
              </Button>
            </div>
          )}

          {/* Owner indicator */}
          {isOwner && (
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-text-muted">This is your post.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Booking request modal ────────────────────────────────────── */}
      <BookingRequestModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        postId={postId}
      />

      {/* ── Report modal ─────────────────────────────────────────────── */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setReportOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="relative bg-surface rounded-xl border border-border p-6 w-full max-w-md z-10 shadow-xl"
          >
            <h3 id="report-title" className="font-semibold text-text mb-4">
              Report Post
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1" htmlFor="report-reason">
                  Reason *
                </label>
                <select
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a reason</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1" htmlFor="report-desc">
                  Additional details (optional)
                </label>
                <textarea
                  id="report-desc"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setReportOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReport}
                  isLoading={reportMutation.isPending}
                >
                  Submit Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
