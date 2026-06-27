import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import { usePost, useUpdatePost, useDeletePost } from '../../hooks/usePosts';
import NeedTransportForm from '../../components/posts/NeedTransportForm';
import VehicleAvailableForm from '../../components/posts/VehicleAvailableForm';
import ReturnJourneyForm from '../../components/posts/ReturnJourneyForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { ROUTES } from '../../constants/routes';

const FORM_MAP = {
  need_transport: NeedTransportForm,
  vehicle_available: VehicleAvailableForm,
  return_journey: ReturnJourneyForm,
};

/** Map a date string from backend (ISO or YYYY-MM-DD) to YYYY-MM-DD for <input type="date">. */
function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

/** Extract RHF defaultValues from a post object, shaped to match each form's schema. */
function extractDefaults(post) {
  if (!post) return {};
  const base = {
    origin_address: post.originAddress ?? post.origin_address ?? '',
    destination_address: post.destinationAddress ?? post.destination_address ?? '',
    availability_date: toDateInputValue(post.availabilityDate ?? post.availability_date),
    vehicle_type: post.vehicleType ?? post.vehicle_type ?? '',
    description: post.description ?? '',
  };

  if (post.postType === 'need_transport' || post.post_type === 'need_transport') {
    return {
      ...base,
      goods_type: post.goodsType ?? post.goods_type ?? '',
      goods_category: post.goodsCategory ?? post.goods_category ?? '',
      goods_weight_kg: post.goodsWeightKg ?? post.goods_weight_kg ?? '',
      budget_min: post.budgetMin ?? post.budget_min ?? '',
      budget_max: post.budgetMax ?? post.budget_max ?? '',
      is_fragile: post.isFragile ?? post.is_fragile ?? false,
    };
  }

  if (post.postType === 'vehicle_available' || post.post_type === 'vehicle_available') {
    return {
      ...base,
      vehicle_capacity_kg: post.vehicleCapacityKg ?? post.vehicle_capacity_kg ?? '',
      price_expectation: post.priceExpectation ?? post.price_expectation ?? '',
    };
  }

  if (post.postType === 'return_journey' || post.post_type === 'return_journey') {
    return {
      ...base,
      remaining_capacity_kg: post.remainingCapacityKg ?? post.remaining_capacity_kg ?? '',
      price_expectation: post.priceExpectation ?? post.price_expectation ?? '',
    };
  }

  return base;
}

export default function EditPostPage() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: post, isLoading, isError } = usePost(postId);
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost(postId);
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-500">Post not found or could not be loaded.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(ROUTES.MARKETPLACE)}
        >
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const postType = post.postType ?? post.post_type;

  // Ownership check — backend enforces too, but redirect early for UX
  if (user && post.owner && user.id !== post.owner.id) {
    navigate(ROUTES.UNAUTHORIZED, { replace: true });
    return null;
  }

  const ActiveForm = FORM_MAP[postType];
  if (!ActiveForm) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-500">Unknown post type — cannot edit this post.</p>
      </div>
    );
  }

  const defaultValues = extractDefaults(post);
  const existingImageUrls = (post.images ?? []).map((img) =>
    typeof img === 'string' ? img : img.imageUrl ?? img.url ?? ''
  );

  const handleSubmit = (formData) => {
    updatePost(formData);
  };

  const handleDelete = () => {
    deletePost(postId);
    setConfirmOpen(false);
  };

  const postTypeLabelMap = {
    need_transport: 'Need Transport',
    vehicle_available: 'Vehicle Available',
    return_journey: 'Return Journey',
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
          <p className="mt-1 text-sm text-gray-500">
            {postTypeLabelMap[postType] ?? postType}
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
        >
          Delete Post
        </Button>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ActiveForm
          defaultValues={defaultValues}
          existingImageUrls={existingImageUrls}
          onSubmit={handleSubmit}
          isPending={isUpdating}
        />
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete this post?"
        message="This action cannot be undone. The post will be permanently removed and any pending bookings will be cancelled."
        confirmLabel="Delete Post"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
