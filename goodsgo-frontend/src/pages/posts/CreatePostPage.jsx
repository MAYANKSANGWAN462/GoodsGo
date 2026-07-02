import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';
import { resendVerification } from '../../services/auth.service';
import NeedTransportForm from '../../components/posts/NeedTransportForm';
import VehicleAvailableForm from '../../components/posts/VehicleAvailableForm';
import ReturnJourneyForm from '../../components/posts/ReturnJourneyForm';
import { useCreatePost } from '../../hooks/usePosts';

const POST_TYPE_TABS = [
  {
    value: 'need_transport',
    label: 'Need Transport',
    description: 'Find a vehicle to move your goods',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    value: 'vehicle_available',
    label: 'Vehicle Available',
    description: 'Offer space in your vehicle',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6m9 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    value: 'return_journey',
    label: 'Return Journey',
    description: 'Fill space on a return trip',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
  },
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
  const [showEmailBanner] = useState(
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
          toast.error('Please verify your email before posting.');
        }
      },
    });
  };

  const ActiveForm = FORM_MAP[activeType];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Create a Post</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Share a transport need, offer your vehicle, or fill capacity on a return trip.
          </p>
        </div>
      </div>

      {/* Email verification banner */}
      {showEmailBanner && !bannerDismissed && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-subtle p-4 animate-fade-in-down">
          <svg className="h-5 w-5 flex-shrink-0 text-warning mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning">Email not verified</p>
            <p className="mt-0.5 text-sm text-text-muted">
              You must verify your email before posting. Check your inbox or{' '}
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="font-semibold text-primary hover:underline disabled:opacity-60"
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
            className="text-text-muted hover:text-text transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Post type selector */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          What type of post?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="tablist" aria-label="Post type">
          {POST_TYPE_TABS.map((tab) => {
            const isActive = activeType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveType(tab.value)}
                className={[
                  'flex items-start gap-3 rounded-xl p-3.5 text-left border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-surface hover:border-border-strong hover:bg-surface-alt',
                ].join(' ')}
              >
                <span className={`flex-shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                  {tab.icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : 'text-text'}`}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-snug">
                    {tab.description}
                  </p>
                </div>
                {isActive && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary flex-shrink-0 ml-auto mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active form in a styled card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm animate-fade-in">
        <ActiveForm onSubmit={handleSubmit} isPending={isPending} />
      </div>
    </div>
  );
}
