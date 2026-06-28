import { useAdminUsers, useAdminPosts, useAdminReports, useAdminDisputes } from '../../hooks/useAdmin';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import useAdminStore from '../../stores/useAdminStore';
import Badge from '../../components/common/Badge';

const ROLE_VARIANT = {
  super_admin: 'danger',
  admin:       'warning',
  moderator:   'info',
};

function StatCard({ label, value, isLoading, accent }) {
  return (
    <Card padding="md">
      <p className="text-text-muted text-sm mb-1">{label}</p>
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <p className={`text-3xl font-bold ${accent}`}>{value ?? '—'}</p>
      )}
    </Card>
  );
}

import PropTypes from 'prop-types';

StatCard.propTypes = {
  label:     PropTypes.string.isRequired,
  value:     PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isLoading: PropTypes.bool,
  accent:    PropTypes.string,
};

export default function AdminDashboardPage() {
  const { admin } = useAdminStore();

  // Fetch summary counts using limit=1 to keep the queries cheap.
  const { data: usersData,    isLoading: loadingUsers    } = useAdminUsers({ limit: 1 });
  const { data: postsData,    isLoading: loadingPosts    } = useAdminPosts({ limit: 1 });
  const { data: reportsData,  isLoading: loadingReports  } = useAdminReports({ status: 'pending', limit: 1 });
  const { data: disputesData, isLoading: loadingDisputes } = useAdminDisputes({ status: 'open', limit: 1 });

  const totalUsers    = usersData?.meta?.total;
  const totalPosts    = postsData?.meta?.total;
  const pendingReports  = reportsData?.meta?.total;
  const openDisputes    = disputesData?.meta?.total;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          {admin && (
            <p className="text-text-muted text-sm mt-0.5">
              Welcome back, {admin.fullName} —{' '}
              <Badge variant={ROLE_VARIANT[admin.adminRole] ?? 'neutral'} size="sm">
                {admin.adminRole?.replace('_', ' ')}
              </Badge>
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={totalUsers}
          isLoading={loadingUsers}
          accent="text-primary"
        />
        <StatCard
          label="Total Posts"
          value={totalPosts}
          isLoading={loadingPosts}
          accent="text-blue-600"
        />
        <StatCard
          label="Pending Reports"
          value={pendingReports}
          isLoading={loadingReports}
          accent="text-warning"
        />
        <StatCard
          label="Open Disputes"
          value={openDisputes}
          isLoading={loadingDisputes}
          accent="text-danger"
        />
      </div>

      {/* Quick-action links */}
      <Card padding="md">
        <h2 className="text-base font-semibold text-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Review Reports',   href: '/admin/reports',  icon: '🚩', urgent: (pendingReports ?? 0) > 0 },
            { label: 'Manage Users',     href: '/admin/users',    icon: '👥', urgent: false },
            { label: 'Moderate Posts',   href: '/admin/posts',    icon: '📋', urgent: false },
            { label: 'Review Disputes',  href: '/admin/reports',  icon: '⚖️',  urgent: (openDisputes ?? 0) > 0 },
            { label: 'Payment Actions',  href: '/admin/payments', icon: '💳', urgent: false },
            { label: 'Review Moderation', href: '/admin/reviews', icon: '⭐', urgent: false },
          ].map(({ label, href, icon, urgent }) => (
            <a
              key={href + label}
              href={href}
              className={[
                'flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors',
                urgent
                  ? 'border-warning bg-amber-50 text-warning hover:bg-amber-100'
                  : 'border-border text-text hover:bg-surface-alt',
              ].join(' ')}
            >
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
