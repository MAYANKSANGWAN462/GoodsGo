export const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  RESOLVED: 'resolved',
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
  resolved: 'Resolved',
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
  resolved: 'success',
};

/**
 * Maps booking status → role → list of eligible action names.
 * Role is either 'owner' (post owner) or 'requester' (booking requester).
 * Empty array means no actions are available for that role in that status.
 */
export const ELIGIBLE_ACTIONS = {
  pending: {
    owner: ['accept', 'reject'],
    requester: ['withdraw'],
  },
  accepted: {
    owner: ['mark_in_progress', 'cancel'],
    requester: ['cancel'],
  },
  in_progress: {
    owner: ['complete', 'cancel', 'dispute'],
    requester: ['cancel', 'dispute'],
  },
  completed: {
    owner: ['dispute'],
    requester: ['dispute'],
  },
  rejected: { owner: [], requester: [] },
  withdrawn: { owner: [], requester: [] },
  cancelled: { owner: [], requester: [] },
  disputed: { owner: [], requester: [] },
  resolved: { owner: [], requester: [] },
};
