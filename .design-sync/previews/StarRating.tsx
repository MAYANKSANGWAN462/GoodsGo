import { StarRating } from 'goods-go';

export function ReadOnly() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <StarRating value={5} readOnly />
      <StarRating value={4.5} readOnly />
      <StarRating value={3.7} readOnly />
      <StarRating value={2} readOnly />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <StarRating value={4.5} size="sm" readOnly />
      <StarRating value={4.5} size="md" readOnly />
      <StarRating value={4.5} size="lg" readOnly />
    </div>
  );
}
