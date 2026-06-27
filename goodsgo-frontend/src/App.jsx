import PropTypes from 'prop-types';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/guards/ProtectedRoute';
import AdminRoute from './components/guards/AdminRoute';
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

import { ROUTES } from './constants/routes';
import { getConfigOptions } from './services/config.service';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Root pages
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Marketplace pages (optionalAuth — no ProtectedRoute wrapper)
import MarketplacePage from './pages/marketplace/MarketplacePage';
import PostDetailPage from './pages/marketplace/PostDetailPage';

// Post management pages (auth required)
import CreatePostPage from './pages/posts/CreatePostPage';
import EditPostPage from './pages/posts/EditPostPage';

// Booking pages (auth required)
import BookingsPage from './pages/bookings/BookingsPage';
import BookingDetailPage from './pages/bookings/BookingDetailPage';

// Chat page (auth required)
import ChatPage from './pages/chat/ChatPage';

// Notifications page (auth required)
import NotificationsPage from './pages/notifications/NotificationsPage';

// Profile pages (auth or public — FE-8)
import MyProfilePage from './pages/profile/MyProfilePage';
import PublicProfilePage from './pages/profile/PublicProfilePage';
import SettingsPage from './pages/profile/SettingsPage';
import SavedPostsPage from './pages/saved/SavedPostsPage';

// Admin pages (stubs — full implementation in FE-Admin block)
import AdminLoginPage from './pages/admin/AdminLoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { fontSize: '14px' },
                }}
              />
              <AppRoutes />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Inner route tree component — rendered inside all providers so it can
 * call hooks (useQuery for startup config fetch).
 */
function AppRoutes() {
  // Fetch reference data once at startup; cached for the entire browser session.
  useQuery({
    queryKey: ['config'],
    queryFn: getConfigOptions,
    staleTime: Infinity,
  });

  return (
    <Routes>
      {/* ── Public root ──────────────────────────────────────────────── */}
      <Route path={ROUTES.HOME} element={<HomePage />} />

      {/* ── Auth pages (each page imports AuthLayout directly) ────────── */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

      {/* ── Admin login (no shell) ────────────────────────────────────── */}
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />

      {/* ── Marketplace + Public Profile (optionalAuth — MainLayout without ProtectedRoute) */}
      <Route element={<MainLayout />}>
        <Route path={ROUTES.MARKETPLACE} element={<MarketplacePage />} />
        <Route path="/marketplace/posts/:id" element={<PostDetailPage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
      </Route>

      {/* ── Protected user routes (MainLayout shell) ─────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.CREATE_POST} element={<CreatePostPage />} />
          <Route path="/posts/:id/edit" element={<EditPostPage />} />
          <Route path={ROUTES.BOOKINGS} element={<BookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path={ROUTES.CHAT} element={<ChatPage />} />
          <Route path={ROUTES.MY_PROFILE} element={<MyProfilePage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path={ROUTES.SAVED} element={<SavedPostsPage />} />
          <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
          <Route path={ROUTES.PAYMENTS} element={<PlaceholderPage title="Payments" />} />
        </Route>
      </Route>

      {/* ── Protected admin routes (AdminLayout shell) ───────────────── */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<PlaceholderPage title="Admin Dashboard" />} />
          <Route path={ROUTES.ADMIN_USERS} element={<PlaceholderPage title="Admin Users" />} />
          <Route path="/admin/users/:id" element={<PlaceholderPage title="Admin User Detail" />} />
          <Route path={ROUTES.ADMIN_POSTS} element={<PlaceholderPage title="Admin Posts" />} />
          <Route path={ROUTES.ADMIN_BOOKINGS} element={<PlaceholderPage title="Admin Bookings" />} />
          <Route path={ROUTES.ADMIN_REPORTS} element={<PlaceholderPage title="Admin Reports" />} />
          <Route path={ROUTES.ADMIN_PAYMENTS} element={<PlaceholderPage title="Admin Payments" />} />
          <Route path={ROUTES.ADMIN_REVIEWS} element={<PlaceholderPage title="Admin Reviews" />} />
        </Route>
      </Route>

      {/* ── Utility pages ────────────────────────────────────────────── */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      {/* ── Catch-all ────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
    </Routes>
  );
}

/** Inline placeholder for routes whose pages are built in later blocks. */
function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-text-muted text-sm">{title} — coming soon.</p>
    </div>
  );
}

PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
};
