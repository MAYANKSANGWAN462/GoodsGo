import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/guards/ProtectedRoute';
import GuestRoute from './components/guards/GuestRoute';
import AdminRoute from './components/guards/AdminRoute';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import PageLoader from './components/common/PageLoader';

import { ROUTES } from './constants/routes';
import { getConfigOptions } from './services/config.service';
import { useBookingStatusSocket } from './hooks/useBookings';
import { usePaymentStatusSocket } from './hooks/usePayments';

// ── Route-level code splitting ──────────────────────────────────────────
// Every page is a lazy chunk so the initial bundle carries only the shell
// (providers, layouts, guards). Guards/layouts stay static — they render
// on every navigation and are small.

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

// Root pages
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));

// Marketplace pages (optionalAuth — no ProtectedRoute wrapper)
const MarketplacePage = lazy(() => import('./pages/marketplace/MarketplacePage'));
const PostDetailPage = lazy(() => import('./pages/marketplace/PostDetailPage'));

// Post management pages (auth required)
const CreatePostPage = lazy(() => import('./pages/posts/CreatePostPage'));
const EditPostPage = lazy(() => import('./pages/posts/EditPostPage'));

// Booking pages (auth required)
const BookingsPage = lazy(() => import('./pages/bookings/BookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/bookings/BookingDetailPage'));

// Chat page (auth required)
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));

// Notifications page (auth required)
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));

// Profile pages (auth or public — FE-8)
const MyProfilePage = lazy(() => import('./pages/profile/MyProfilePage'));
const PublicProfilePage = lazy(() => import('./pages/profile/PublicProfilePage'));
const SettingsPage = lazy(() => import('./pages/profile/SettingsPage'));
const SavedPostsPage = lazy(() => import('./pages/saved/SavedPostsPage'));

// Payments page (FE-10)
const PaymentHistoryPage = lazy(() => import('./pages/payments/PaymentHistoryPage'));

// Admin pages (FE-11)
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'));
const AdminPostsPage = lazy(() => import('./pages/admin/AdminPostsPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));

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
                containerStyle={{ top: 64, right: 16, maxWidth: 360 }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontSize: '14px',
                    fontFamily: "'Barlow', system-ui, sans-serif",
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 0 0 1px var(--color-border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    maxWidth: '360px',
                  },
                  success: {
                    iconTheme: { primary: '#22c55e', secondary: 'white' },
                  },
                  error: {
                    iconTheme: { primary: '#ef4444', secondary: 'white' },
                  },
                  loading: {
                    iconTheme: { primary: '#D31905', secondary: 'transparent' },
                  },
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

  // Global socket listeners — must live inside providers (QueryClient + SocketStore).
  useBookingStatusSocket();
  usePaymentStatusSocket();

  // Prefetch the chunks a visitor is most likely to hit next (marketplace,
  // post detail, login) once the browser is idle, so navigation is instant
  // without inflating the initial bundle.
  useEffect(() => {
    const prefetch = () => {
      import('./pages/marketplace/MarketplacePage');
      import('./pages/marketplace/PostDetailPage');
      import('./pages/auth/LoginPage');
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader variant="page" />}>
    <Routes>
      {/* ── Public root ──────────────────────────────────────────────── */}
      <Route path={ROUTES.HOME} element={<HomePage />} />

      {/* ── Auth pages — wrapped in GuestRoute so logged-in users are ──── */}
      {/* ── redirected to the marketplace instead of seeing auth forms.  ── */}
      <Route element={<GuestRoute />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      </Route>

      {/* ── Verify email — accessible regardless of auth state ──────────── */}
      {/* ── (user may or may not be logged in when they click the link).  ── */}
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

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
          <Route path={ROUTES.PAYMENTS} element={<PaymentHistoryPage />} />
        </Route>
      </Route>

      {/* ── Protected admin routes (AdminLayout shell) ───────────────── */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
          <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path={ROUTES.ADMIN_POSTS} element={<AdminPostsPage />} />
          <Route path={ROUTES.ADMIN_BOOKINGS} element={<AdminBookingsPage />} />
          <Route path={ROUTES.ADMIN_REPORTS} element={<AdminReportsPage />} />
          <Route path={ROUTES.ADMIN_PAYMENTS} element={<AdminPaymentsPage />} />
          <Route path={ROUTES.ADMIN_REVIEWS} element={<AdminReviewsPage />} />
        </Route>
      </Route>

      {/* ── Utility pages ────────────────────────────────────────────── */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      {/* ── Catch-all ────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
