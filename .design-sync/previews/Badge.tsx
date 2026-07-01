import { Badge } from 'goods-go';

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16 }}>
      <Badge variant="default">Pending</Badge>
      <Badge variant="secondary">Carrier</Badge>
      <Badge variant="success">Delivered</Badge>
      <Badge variant="warning">In Transit</Badge>
      <Badge variant="danger">Cancelled</Badge>
      <Badge variant="info">New</Badge>
      <Badge variant="neutral">Draft</Badge>
    </div>
  );
}

export function WithDot() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16 }}>
      <Badge variant="success" dot>Active</Badge>
      <Badge variant="warning" dot>Awaiting pickup</Badge>
      <Badge variant="danger" dot>Offline</Badge>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 16 }}>
      <Badge size="xs">xs</Badge>
      <Badge size="sm">sm</Badge>
      <Badge size="md">md</Badge>
    </div>
  );
}
