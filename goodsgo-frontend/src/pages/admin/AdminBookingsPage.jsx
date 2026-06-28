import Card from '../../components/common/Card';
import { ROUTES } from '../../constants/routes';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

/**
 * AdminBookingsPage — Informational page.
 *
 * No GET /admin/bookings endpoint exists in the backend (admin.routes.js).
 * Booking oversight is done through the Disputes section (GET /admin/disputes)
 * which surfaces problematic bookings, and through individual user profiles
 * (GET /admin/users/:userId) which include booking counts.
 *
 * If a dedicated admin bookings list is needed in the future, a backend endpoint
 * must be added to admin.routes.js first.
 */
export default function AdminBookingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text mb-2">Booking Overview</h1>
      <p className="text-text-muted text-sm mb-6">
        Booking management for administrators.
      </p>

      <div className="space-y-4">
        <Card padding="md">
          <h2 className="text-base font-semibold text-text mb-2">How to manage bookings</h2>
          <p className="text-sm text-text-muted mb-4">
            Bookings are self-managed by users — the platform enforces the booking state
            machine (pending → accepted → in_progress → completed). Admin actions are
            available for disputed bookings and for payment intervention.
          </p>
          <ul className="text-sm text-text-muted space-y-2 list-disc list-inside">
            <li>Disputed bookings appear in the <strong>Reports</strong> section under the Disputes tab.</li>
            <li>Payment release and refund actions are available on the <strong>Payments</strong> page.</li>
            <li>User booking counts are visible on each user's detail page.</li>
          </ul>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Link to={ROUTES.ADMIN_REPORTS}>
            <Button variant="primary">View Disputes</Button>
          </Link>
          <Link to={ROUTES.ADMIN_PAYMENTS}>
            <Button variant="secondary">Payment Actions</Button>
          </Link>
          <Link to={ROUTES.ADMIN_USERS}>
            <Button variant="ghost">User Details</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-warning rounded-lg">
        <p className="text-sm text-warning font-medium">Backend Note</p>
        <p className="text-sm text-text-muted mt-1">
          A <code className="bg-amber-100 px-1 rounded">GET /admin/bookings</code> endpoint
          does not currently exist. To add a booking list view here, add the endpoint to{' '}
          <code className="bg-amber-100 px-1 rounded">admin.routes.js</code> and{' '}
          <code className="bg-amber-100 px-1 rounded">admin.service.js</code> in the backend.
        </p>
      </div>
    </div>
  );
}
