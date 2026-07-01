import { PageHeader, Button, Badge } from 'goods-go';

export function Simple() {
  return (
    <div style={{ padding: '24px 24px 8px', maxWidth: 640 }}>
      <PageHeader
        title="My Bookings"
        description="Track the status of your transport bookings in real time."
      />
    </div>
  );
}

export function WithActions() {
  return (
    <div style={{ padding: '24px 24px 8px', maxWidth: 640 }}>
      <PageHeader
        title="Marketplace"
        description="Browse available transport posts near you."
        actions={
          <>
            <Button variant="secondary" size="sm">Filter</Button>
            <Button size="sm">Post transport</Button>
          </>
        }
      />
    </div>
  );
}

export function WithBackAndBadge() {
  return (
    <div style={{ padding: '24px 24px 8px', maxWidth: 640 }}>
      <PageHeader
        title="Booking #GG-2041"
        badge={<Badge variant="success">Confirmed</Badge>}
        onBack={() => {}}
        backLabel="Back to bookings"
      />
    </div>
  );
}
