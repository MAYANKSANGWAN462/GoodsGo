import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';
import { resendVerification } from '../../services/auth.service';
import NeedTransportForm from '../../components/posts/NeedTransportForm';
import VehicleAvailableForm from '../../components/posts/VehicleAvailableForm';
import ReturnJourneyForm from '../../components/posts/ReturnJourneyForm';
import Button from '../../components/common/Button';
import { useCreatePost } from '../../hooks/usePosts';

const POST_TYPE_TABS = [
  { value: 'need_transport', label: 'Need Transport' },
  { value: 'vehicle_available', label: 'Vehicle Available' },
  { value: 'return_journey', label: 'Return Journey' },
];

const FORM_MAP = {
  need_transport: NeedTransportForm,
  vehicle_available: VehicleAvailableForm,
  return_journey: ReturnJourneyForm,
};

export default function CreatePostPage() {
  const user = useAuthStore((s) => s.user);
  const [activeType, setActiveType] = useState('need_transport');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showEmailBanner, setShowEmailBanner] = useState(
    Boolean(user && !user.isEmailVerified)
  );

  const { mutate: createPost, isPending } = useCreatePost();

  const resendMutation = useMutation({
    mutationFn: () => resendVerification({ email: user.email }),
    onSuccess: () =>
      toast.success('Verification email sent. Check your inbox.'),
    onError: () =>
      toast.error('Could not send verification email. Try again later.'),
  });

  const handleSubmit = (formData) => {
    createPost(formData, {
      onError: (err) => {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setShowEmailBanner(true);
        }
      },
    });
  };

  const ActiveForm = FORM_MAP[activeType];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create a Post</h1>
        <p className="mt-1 text-sm text-gray-500">
          Share a transport need, offer your vehicle, or fill capacity on a return trip.
        </p>
      </div>

      {/* Email verification banner */}
      {showEmailBanner && !bannerDismissed && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <svg
            className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Email not verified
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              You must verify your email before posting. Check your inbox or{' '}
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="font-medium underline hover:no-underline disabled:opacity-60"
              >
                {resendMutation.isPending ? 'Sending…' : 'resend the link'}
              </button>
              .
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss banner"
            onClick={() => setBannerDismissed(true)}
            className="text-amber-500 hover:text-amber-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Post type selector tabs */}
      <div
        className="mb-6 flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1"
        role="tablist"
        aria-label="Post type"
      >
        {POST_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeType === tab.value}
            onClick={() => setActiveType(tab.value)}
            className={[
              'flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              activeType === tab.value
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ActiveForm onSubmit={handleSubmit} isPending={isPending} />
      </div>
    </div>
  );
}
