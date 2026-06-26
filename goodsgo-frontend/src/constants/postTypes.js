export const POST_TYPES = {
  need_transport: {
    label: 'Need Transport',
    badgeVariant: 'info',
  },
  vehicle_available: {
    label: 'Vehicle Available',
    badgeVariant: 'success',
  },
  return_journey: {
    label: 'Return Journey',
    badgeVariant: 'warning',
  },
};

export const POST_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'need_transport', label: 'Need Transport' },
  { value: 'vehicle_available', label: 'Vehicle Available' },
  { value: 'return_journey', label: 'Return Journey' },
];
