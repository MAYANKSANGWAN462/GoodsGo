export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  MARKETPLACE: '/marketplace',
  POST_DETAIL: '/marketplace/posts/:id',

  CREATE_POST: '/posts/create',
  EDIT_POST: '/posts/:id/edit',

  BOOKINGS: '/bookings',
  BOOKING_DETAIL: '/bookings/:id',

  CHAT: '/chat',

  MY_PROFILE: '/profile/me',
  SETTINGS: '/profile/settings',
  PUBLIC_PROFILE: '/profile/:userId',

  SAVED: '/saved',
  NOTIFICATIONS: '/notifications',
  PAYMENTS: '/payments',

  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_DETAIL: '/admin/users/:id',
  ADMIN_POSTS: '/admin/posts',
  ADMIN_BOOKINGS: '/admin/bookings',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_REVIEWS: '/admin/reviews',

  NOT_FOUND: '/404',
  UNAUTHORIZED: '/unauthorized',
};

/** Helper: replace :param tokens in a ROUTES constant with real values. */
export function buildRoute(pattern, params = {}) {
  return Object.entries(params).reduce(
    (path, [key, val]) => path.replace(`:${key}`, val),
    pattern
  );
}
