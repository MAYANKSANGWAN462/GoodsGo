export const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
};

export const BOOKING_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

/** Badge variant for each booking status — maps to Badge component's variant prop. */
export const BOOKING_STATUS_BADGE_VARIANT = {
  pending: 'warning',
  accepted: 'info',
  rejected: 'danger',
  withdrawn: 'neutral',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'danger',
  disputed: 'danger',
};

/**
 * Static eligible-actions table for statuses where role/post-type don't affect the result.
 * For `accepted` and `in_progress`, use getEligibleActions() instead — those two statuses
 * require post-type awareness to resolve the correct actor.
 */
export const ELIGIBLE_ACTIONS = {
  pending: {
    owner: ['accept', 'reject'],
    requester: ['withdraw'],
  },
  accepted: {
    // Default (vehicle_available / return_journey):
    // owner = transporter → marks in-progress; requester = shipper → pays.
    owner: ['mark_in_progress', 'cancel'],
    requester: ['pay', 'cancel'],
  },
  in_progress: {
    // Default (vehicle_available / return_journey):
    // owner = transporter → can cancel/dispute; requester = shipper → confirms completion.
    owner: ['cancel', 'dispute'],
    requester: ['complete', 'cancel', 'dispute'],
  },
  completed: {
    owner: ['dispute'],
    requester: ['dispute'],
  },
  rejected: { owner: [], requester: [] },
  withdrawn: { owner: [], requester: [] },
  cancelled: { owner: [], requester: [] },
  disputed: { owner: [], requester: [] },
};

/**
 * Returns the list of eligible action names for the current user's perspective on a booking.
 *
 * Role ownership depends on post_type:
 *   need_transport → post_owner = Shipper (customer), requester = Transporter
 *   vehicle_available / return_journey → post_owner = Transporter, requester = Shipper
 *
 * For `accepted`:
 *   - Transporter marks in-progress after collecting goods.
 *   - Shipper pays before/after handover (per agreed flow).
 * For `in_progress`:
 *   - Transporter can cancel or dispute but cannot confirm completion.
 *   - Shipper confirms delivery to unlock payment and reviews.
 *
 * @param {string} status     - Current booking status
 * @param {boolean} isOwner   - True when the current user is the post owner
 * @param {string} postType   - 'need_transport' | 'vehicle_available' | 'return_journey'
 * @returns {string[]}
 */
export function getEligibleActions(status, isOwner, postType) {
  const base = ELIGIBLE_ACTIONS[status];
  if (!base) return [];

  const role = isOwner ? 'owner' : 'requester';
  const isNeedTransport = postType === 'need_transport';

  if (status === 'accepted') {
    if (isNeedTransport) {
      // need_transport: owner=shipper pays; requester=transporter marks in-progress.
      return isOwner ? ['pay', 'cancel'] : ['mark_in_progress', 'cancel'];
    }
    // vehicle/return: static table is already correct.
    return base[role] ?? [];
  }

  if (status === 'in_progress') {
    if (isNeedTransport) {
      // need_transport: owner=shipper confirms; requester=transporter can cancel/dispute.
      return isOwner ? ['complete', 'cancel', 'dispute'] : ['cancel', 'dispute'];
    }
    // vehicle/return: static table is already correct.
    return base[role] ?? [];
  }

  return base[role] ?? [];
}
