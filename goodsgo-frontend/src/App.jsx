import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/guards/ProtectedRoute';
import AdminRoute from './components/guards/AdminRoute';
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

import { ROUTES } from './constants/routes';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Root pages
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

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
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontSize: '14px' },
            }}
          />
          <Routes>
            {/* ── Public root ───────────────────────────────────────── */}
            <Route path={ROUTES.HOME} element={<HomePage />} />

            {/* ── Auth pages (no shell) ─────────────────────────────── */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

            {/* ── Admin login (no shell) ────────────────────────────── */}
            <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />

            {/* ── Protected user routes (MainLayout shell) ─────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* Placeholders — each will be replaced by real pages in later blocks */}
                <Route path={ROUTES.MARKETPLACE} element={<PlaceholderPage title="Marketplace" />} />
                <Route path="/marketplace/posts/:id" element={<PlaceholderPage title="Post Detail" />} />
                <Route path={ROUTES.CREATE_POST} element={<PlaceholderPage title="Create Post" />} />
                <Route path="/posts/:id/edit" element={<PlaceholderPage title="Edit Post" />} />
                <Route path={ROUTES.BOOKINGS} element={<PlaceholderPage title="Bookings" />} />
                <Route path="/bookings/:id" element={<PlaceholderPage title="Booking Detail" />} />
                <Route path={ROUTES.CHAT} element={<PlaceholderPage title="Chat" />} />
                <Route path={ROUTES.MY_PROFILE} element={<PlaceholderPage title="My Profile" />} />
                <Route path={ROUTES.SETTINGS} element={<PlaceholderPage title="Settings" />} />
                <Route path="/profile/:userId" element={<PlaceholderPage title="Public Profile" />} />
                <Route path={ROUTES.SAVED} element={<PlaceholderPage title="Saved Posts" />} />
                <Route path={ROUTES.NOTIFICATIONS} element={<PlaceholderPage title="Notifications" />} />
                <Route path={ROUTES.PAYMENTS} element={<PlaceholderPage title="Payments" />} />
              </Route>
            </Route>

            {/* ── Protected admin routes (AdminLayout shell) ───────── */}
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

            {/* ── Utility pages ─────────────────────────────────────── */}
            <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
            <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

            {/* ── Catch-all ─────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
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
