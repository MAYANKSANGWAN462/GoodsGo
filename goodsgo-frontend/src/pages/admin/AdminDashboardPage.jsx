import { Link } from 'react-router-dom';
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

function StatCard({ label, value, isLoading, accent, borderAccent, bgAccent, icon }) {
  return (
    <div className={`bg-surface rounded-xl p-5 border border-border border-l-4 ${borderAccent} ${bgAccent} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-text-muted text-sm font-medium">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <p className={`text-3xl font-bold tracking-tight ${accent}`}>{value ?? '—'}</p>
      )}
    </div>
  );
}

import PropTypes from 'prop-types';

StatCard.propTypes = {
  label:        PropTypes.string.isRequired,
  value:        PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isLoading:    PropTypes.bool,
  accent:       PropTypes.string,
  borderAccent: PropTypes.string,
  bgAccent:     PropTypes.string,
  icon:         PropTypes.string,
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
          borderAccent="border-l-primary"
          bgAccent="bg-primary/5"
          icon="👥"
        />
        <StatCard
          label="Total Posts"
          value={totalPosts}
          isLoading={loadingPosts}
          accent="text-secondary"
          borderAccent="border-l-secondary"
          bgAccent="bg-secondary/5"
          icon="📋"
        />
        <StatCard
          label="Pending Reports"
          value={pendingReports}
          isLoading={loadingReports}
          accent="text-warning"
          borderAccent="border-l-warning"
          bgAccent="bg-warning-subtle"
          icon="🚩"
        />
        <StatCard
          label="Open Disputes"
          value={openDisputes}
          isLoading={loadingDisputes}
          accent="text-danger"
          borderAccent="border-l-danger"
          bgAccent="bg-danger-subtle"
          icon="⚖️"
        />
      </div>

      {/* Quick-action links */}
      <Card padding="md">
        <h2 className="text-base font-semibold text-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Review Reports',    href: '/admin/reports',  icon: '🚩', iconBg: 'bg-orange-100', urgent: (pendingReports ?? 0) > 0 },
            { label: 'Manage Users',      href: '/admin/users',    icon: '👥', iconBg: 'bg-blue-100',   urgent: false },
            { label: 'Moderate Posts',    href: '/admin/posts',    icon: '📋', iconBg: 'bg-purple-100', urgent: false },
            { label: 'Review Disputes',   href: '/admin/reports',  icon: '⚖️', iconBg: 'bg-red-100',    urgent: (openDisputes ?? 0) > 0 },
            { label: 'Payment Actions',   href: '/admin/payments', icon: '💳', iconBg: 'bg-green-100',  urgent: false },
            { label: 'Review Moderation', href: '/admin/reviews',  icon: '⭐', iconBg: 'bg-yellow-100', urgent: false },
          ].map(({ label, href, icon, iconBg, urgent }) => (
            <Link
              key={href + label}
              to={href}
              className={[
                'flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all hover:shadow-sm',
                urgent
                  ? 'border-warning/40 bg-warning-subtle text-text hover:border-warning/60'
                  : 'border-border bg-surface text-text hover:bg-surface-alt hover:border-border-strong',
              ].join(' ')}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${iconBg}`}>{icon}</span>
              <span className="leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
