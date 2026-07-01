import { EmptyState, Button } from 'goods-go';

const SearchIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BoxIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
  </svg>
);

export function WithAction() {
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="No posts found"
      message="Try adjusting your filters or searching in a different area."
      action={<Button size="sm" variant="secondary">Clear filters</Button>}
    />
  );
}

export function Simple() {
  return (
    <EmptyState
      title="No bookings yet"
      message="Your upcoming bookings will appear here once you confirm one."
    />
  );
}

export function Small() {
  return (
    <EmptyState
      icon={<BoxIcon />}
      title="Nothing here"
      size="sm"
    />
  );
}
