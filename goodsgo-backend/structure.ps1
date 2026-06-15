# =========================
# GOODSGO BACKEND STRUCTURE
# =========================

$folders = @(
    "src",
    "src/config",
    "src/middleware",
    "src/modules/auth",
    "src/modules/users",
    "src/modules/posts",
    "src/modules/bookings",
    "src/modules/chat",
    "src/modules/reviews",
    "src/modules/payments",
    "src/modules/notifications",
    "src/modules/location",
    "src/modules/admin",
    "src/socket",
    "src/utils",
    "src/db",
    "src/db/migrations",
    "src/db/seeds"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created Folder: $folder"
    }
}

$files = @(
    "server.js",

    "src/app.js",

    "src/config/database.js",
    "src/config/cloudinary.js",
    "src/config/email.js",
    "src/config/socket.js",

    "src/middleware/auth.middleware.js",
    "src/middleware/adminAuth.middleware.js",
    "src/middleware/validate.middleware.js",
    "src/middleware/rateLimiter.middleware.js",
    "src/middleware/upload.middleware.js",
    "src/middleware/sanitize.middleware.js",
    "src/middleware/errorHandler.middleware.js",

    "src/modules/auth/auth.routes.js",
    "src/modules/auth/auth.controller.js",
    "src/modules/auth/auth.service.js",
    "src/modules/auth/auth.validator.js",

    "src/modules/users/users.routes.js",
    "src/modules/users/users.controller.js",
    "src/modules/users/users.service.js",
    "src/modules/users/users.validator.js",

    "src/modules/posts/posts.routes.js",
    "src/modules/posts/posts.controller.js",
    "src/modules/posts/posts.service.js",
    "src/modules/posts/posts.validator.js",

    "src/modules/bookings/bookings.routes.js",
    "src/modules/bookings/bookings.controller.js",
    "src/modules/bookings/bookings.service.js",
    "src/modules/bookings/bookings.validator.js",

    "src/modules/chat/chat.routes.js",
    "src/modules/chat/chat.controller.js",
    "src/modules/chat/chat.service.js",
    "src/modules/chat/chat.validator.js",

    "src/modules/reviews/reviews.routes.js",
    "src/modules/reviews/reviews.controller.js",
    "src/modules/reviews/reviews.service.js",
    "src/modules/reviews/reviews.validator.js",

    "src/modules/payments/payments.routes.js",
    "src/modules/payments/payments.controller.js",
    "src/modules/payments/payments.service.js",
    "src/modules/payments/payments.validator.js",

    "src/modules/notifications/notifications.routes.js",
    "src/modules/notifications/notifications.controller.js",
    "src/modules/notifications/notifications.service.js",

    "src/modules/location/location.routes.js",
    "src/modules/location/location.controller.js",
    "src/modules/location/location.service.js",

    "src/modules/admin/admin.routes.js",
    "src/modules/admin/admin.controller.js",
    "src/modules/admin/admin.service.js",

    "src/socket/socket.handler.js",
    "src/socket/chat.socket.js",
    "src/socket/notification.socket.js",

    "src/utils/ApiError.js",
    "src/utils/ApiResponse.js",
    "src/utils/asyncHandler.js",
    "src/utils/generateTokens.js",
    "src/utils/hashPassword.js",
    "src/utils/sendEmail.js",
    "src/utils/uploadImage.js",
    "src/utils/calculateDistance.js",
    "src/utils/generateOTP.js",
    "src/utils/paginate.js",
    "src/utils/constants.js",

    "src/db/migrations/001_create_extensions.sql",
    "src/db/migrations/002_create_users.sql",
    "src/db/migrations/003_create_refresh_tokens.sql",
    "src/db/migrations/004_create_email_verifications.sql",
    "src/db/migrations/005_create_password_resets.sql",
    "src/db/migrations/006_create_posts.sql",
    "src/db/migrations/007_create_post_images.sql",
    "src/db/migrations/008_create_bookings.sql",
    "src/db/migrations/009_create_booking_status_history.sql",
    "src/db/migrations/010_create_conversations.sql",
    "src/db/migrations/011_create_messages.sql",
    "src/db/migrations/012_create_reviews.sql",
    "src/db/migrations/013_create_payments.sql",
    "src/db/migrations/014_create_notifications.sql",
    "src/db/migrations/015_create_saved_posts.sql",
    "src/db/migrations/016_create_reported_posts.sql",
    "src/db/migrations/017_create_admin_users.sql",
    "src/db/migrations/018_create_platform_settings.sql",

    "src/db/seeds/seed_admin.js",
    "src/db/seeds/seed_vehicle_types.js",
    "src/db/seeds/seed_goods_categories.js",

    "src/db/migrate.js",

    ".env.example",
    ".gitignore"
)

foreach ($file in $files) {
    if (!(Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created File: $file"
    }
}

Write-Host ""
Write-Host "===================================="
Write-Host "GOODSGO BACKEND STRUCTURE CREATED"
Write-Host "===================================="