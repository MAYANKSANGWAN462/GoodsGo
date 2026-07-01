import { PageLoader } from 'goods-go';

export function Inline() {
  return <PageLoader variant="inline" label="Loading posts..." />;
}

export function InlineNoLabel() {
  return <PageLoader variant="inline" label="" />;
}

export function Section() {
  return (
    <div style={{ position: 'relative', height: 200, background: 'var(--color-surface-alt)' }}>
      <PageLoader variant="section" label="Fetching bookings..." />
    </div>
  );
}
