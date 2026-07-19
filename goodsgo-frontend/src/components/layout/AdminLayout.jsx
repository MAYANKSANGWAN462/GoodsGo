import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAdminStore from '../../stores/useAdminStore';
import { ROUTES } from '../../constants/routes';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';

const NAV_ITEMS = [
  { label: 'Dashboard',  to: ROUTES.ADMIN_DASHBOARD, icon: '▤' },
  { label: 'Users',      to: ROUTES.ADMIN_USERS,     icon: '👥' },
  { label: 'Posts',      to: ROUTES.ADMIN_POSTS,     icon: '📋' },
  { label: 'Bookings',   to: ROUTES.ADMIN_BOOKINGS,  icon: '📅' },
  { label: 'Reports',    to: ROUTES.ADMIN_REPORTS,   icon: '🚩' },
  { label: 'Payments',   to: ROUTES.ADMIN_PAYMENTS,  icon: '💳' },
  { label: 'Reviews',    to: ROUTES.ADMIN_REVIEWS,   icon: '⭐' },
];

const ROLE_VARIANT = {
  super_admin: 'danger',
  admin:       'warning',
  moderator:   'info',
};

function AdminSidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full w-60 bg-[#0d1f3c] flex flex-col z-30',
          'transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="text-white font-bold text-base tracking-tight">GoodsGo</span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-white/30 bg-white/10 px-1.5 py-0.5 rounded">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5">
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.ADMIN_DASHBOARD}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/55 hover:bg-white/8 hover:text-white/90',
                ].join(' ')
              }
            >
              <span className="text-base w-5 text-center opacity-90">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-white/25 text-xs text-center tracking-wide">GoodsGo Admin v1.0</p>
        </div>
      </aside>
    </>
  );
}

AdminSidebar.propTypes = {
  isOpen:  PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, clearAdminAuth } = useAdminStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAdminAuth();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  }

  return (
    <div className="flex h-screen bg-surface-alt overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-surface border-b border-border flex items-center justify-between px-4 py-3 shrink-0 shadow-sm">
          {/* Hamburger */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-text-muted hover:bg-surface-alt"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {admin && (
              <>
                <Badge variant={ROLE_VARIANT[admin.adminRole] ?? 'neutral'}>
                  {admin.adminRole?.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-2">
                  <Avatar name={admin.fullName} size="sm" />
                  <span className="text-sm font-medium text-text hidden sm:block">{admin.fullName}</span>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-text-muted hover:text-danger transition-colors px-2 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
