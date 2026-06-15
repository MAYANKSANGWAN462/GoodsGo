# ===================================
# GOODSGO FRONTEND STRUCTURE CREATOR
# ===================================

$folders = @(
    "src/assets",
    "src/assets/images",
    "src/assets/icons",

    "src/components",
    "src/components/common",
    "src/components/layout",
    "src/components/guards",
    "src/components/posts",
    "src/components/bookings",
    "src/components/chat",
    "src/components/reviews",
    "src/components/notifications",
    "src/components/location",
    "src/components/profile",

    "src/pages",
    "src/pages/auth",
    "src/pages/marketplace",
    "src/pages/posts",
    "src/pages/bookings",
    "src/pages/chat",
    "src/pages/profile",
    "src/pages/saved",
    "src/pages/notifications",
    "src/pages/payments",
    "src/pages/admin",

    "src/context",
    "src/hooks",
    "src/services",
    "src/utils",
    "src/constants"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created Folder: $folder"
    }
}

$files = @(

    # Assets
    "src/assets/images/logo.svg",
    "src/assets/images/logo-dark.svg",
    "src/assets/images/hero-illustration.svg",
    "src/assets/images/empty-feed.svg",
    "src/assets/images/truck-placeholder.png",

    # Common Components
    "src/components/common/Button.jsx",
    "src/components/common/Input.jsx",
    "src/components/common/Select.jsx",
    "src/components/common/Textarea.jsx",
    "src/components/common/Modal.jsx",
    "src/components/common/Spinner.jsx",
    "src/components/common/Avatar.jsx",
    "src/components/common/Badge.jsx",
    "src/components/common/Card.jsx",
    "src/components/common/Pagination.jsx",
    "src/components/common/EmptyState.jsx",
    "src/components/common/ErrorBoundary.jsx",
    "src/components/common/ConfirmDialog.jsx",
    "src/components/common/StarRating.jsx",

    # Layout
    "src/components/layout/MainLayout.jsx",
    "src/components/layout/AuthLayout.jsx",
    "src/components/layout/AdminLayout.jsx",
    "src/components/layout/Navbar.jsx",
    "src/components/layout/Sidebar.jsx",
    "src/components/layout/Footer.jsx",

    # Guards
    "src/components/guards/ProtectedRoute.jsx",
    "src/components/guards/AdminRoute.jsx",

    # Posts
    "src/components/posts/PostCard.jsx",
    "src/components/posts/PostList.jsx",
    "src/components/posts/PostFilters.jsx",
    "src/components/posts/PostTypeBadge.jsx",
    "src/components/posts/PostImageGallery.jsx",
    "src/components/posts/NeedTransportForm.jsx",
    "src/components/posts/VehicleAvailableForm.jsx",
    "src/components/posts/ReturnJourneyForm.jsx",

    # Bookings
    "src/components/bookings/BookingCard.jsx",
    "src/components/bookings/BookingList.jsx",
    "src/components/bookings/BookingStatusBadge.jsx",
    "src/components/bookings/BookingRequestModal.jsx",
    "src/components/bookings/BookingActionButtons.jsx",

    # Chat
    "src/components/chat/ConversationList.jsx",
    "src/components/chat/ChatWindow.jsx",
    "src/components/chat/MessageBubble.jsx",
    "src/components/chat/TypingIndicator.jsx",
    "src/components/chat/ChatInputBar.jsx",

    # Reviews
    "src/components/reviews/ReviewCard.jsx",
    "src/components/reviews/ReviewList.jsx",
    "src/components/reviews/ReviewForm.jsx",

    # Notifications
    "src/components/notifications/NotificationBell.jsx",
    "src/components/notifications/NotificationDropdown.jsx",
    "src/components/notifications/NotificationItem.jsx",

    # Location
    "src/components/location/LocationAutocomplete.jsx",
    "src/components/location/MapPicker.jsx",

    # Profile
    "src/components/profile/ProfileHeader.jsx",
    "src/components/profile/ProfileStats.jsx",
    "src/components/profile/VerificationBadges.jsx",

    # Auth Pages
    "src/pages/auth/LoginPage.jsx",
    "src/pages/auth/RegisterPage.jsx",
    "src/pages/auth/ForgotPasswordPage.jsx",
    "src/pages/auth/ResetPasswordPage.jsx",

    # Marketplace Pages
    "src/pages/marketplace/MarketplacePage.jsx",
    "src/pages/marketplace/PostDetailPage.jsx",

    # Post Pages
    "src/pages/posts/CreatePostPage.jsx",
    "src/pages/posts/EditPostPage.jsx",

    # Booking Pages
    "src/pages/bookings/BookingsPage.jsx",
    "src/pages/bookings/BookingDetailPage.jsx",

    # Chat Page
    "src/pages/chat/ChatPage.jsx",

    # Profile Pages
    "src/pages/profile/MyProfilePage.jsx",
    "src/pages/profile/PublicProfilePage.jsx",
    "src/pages/profile/SettingsPage.jsx",

    # Saved
    "src/pages/saved/SavedPostsPage.jsx",

    # Notifications
    "src/pages/notifications/NotificationsPage.jsx",

    # Payments
    "src/pages/payments/PaymentHistoryPage.jsx",

    # Admin Pages
    "src/pages/admin/AdminLoginPage.jsx",
    "src/pages/admin/AdminDashboardPage.jsx",
    "src/pages/admin/AdminUsersPage.jsx",
    "src/pages/admin/AdminUserDetailPage.jsx",
    "src/pages/admin/AdminPostsPage.jsx",
    "src/pages/admin/AdminBookingsPage.jsx",
    "src/pages/admin/AdminReviewsPage.jsx",
    "src/pages/admin/AdminReportsPage.jsx",
    "src/pages/admin/AdminPaymentsPage.jsx",

    # Main Pages
    "src/pages/HomePage.jsx",
    "src/pages/NotFoundPage.jsx",
    "src/pages/UnauthorizedPage.jsx",

    # Context
    "src/context/AuthContext.jsx",
    "src/context/SocketContext.jsx",
    "src/context/NotificationContext.jsx",

    # Hooks
    "src/hooks/useAuth.js",
    "src/hooks/useSocket.js",
    "src/hooks/usePosts.js",
    "src/hooks/useBookings.js",
    "src/hooks/useChat.js",
    "src/hooks/useNotifications.js",
    "src/hooks/useLocation.js",
    "src/hooks/useDebounce.js",
    "src/hooks/useInfiniteScroll.js",

    # Services
    "src/services/api.js",
    "src/services/auth.service.js",
    "src/services/users.service.js",
    "src/services/posts.service.js",
    "src/services/bookings.service.js",
    "src/services/chat.service.js",
    "src/services/reviews.service.js",
    "src/services/payments.service.js",
    "src/services/notifications.service.js",
    "src/services/location.service.js",

    # Utils
    "src/utils/formatters.js",
    "src/utils/validators.js",
    "src/utils/storage.js",
    "src/utils/errorParser.js",
    "src/utils/generateInitials.js",

    # Constants
    "src/constants/postTypes.js",
    "src/constants/vehicleTypes.js",
    "src/constants/goodsCategories.js",
    "src/constants/bookingStatuses.js",
    "src/constants/routes.js"
)

foreach ($file in $files) {
    if (!(Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created File: $file"
    }
}

Write-Host ""
Write-Host "=================================="
Write-Host "GOODSGO FRONTEND STRUCTURE READY"
Write-Host "=================================="