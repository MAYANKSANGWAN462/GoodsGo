'use strict';

const { query, getClient }   = require('../../config/database');
const { emitToUser }         = require('../../config/socket');
const ApiError               = require('../../utils/ApiError');
const {
  BOOKING_STATUS,
  POST_STATUS,
  CONVERSATION_STATUS,
  POST_TYPES,
  SOCKET_EVENTS
} = require('../../utils/constants');

// ─── Lazy notification loader ─────────────────────────────────────────────────
// Block I (Notifications) may not exist yet. Using lazy require prevents crash.
// Once Block I is generated, all notifications fire automatically.

let _notifService = null;
function getNotifService() {
  if (_notifService) return _notifService;
  try {
    _notifService = require('../notifications/notifications.service');
    return _notifService;
  } catch {
    return null;
  }
}

async function notify(payload) {
  const svc = getNotifService();
  if (!svc) return;
  try {
    await svc.createNotification(payload);
  } catch (err) {
    console.error('[Bookings] Notification error:', err.message);
  }
}

/**
 * Emit BOOKING_STATUS_CHANGED to both parties so the frontend React Query
 * cache can be invalidated without a manual refresh.
 */
function emitBookingStatusChanged(requesterId, postOwnerId, bookingId, postId, status) {
  const payload = { bookingId, postId, status };
  emitToUser(requesterId, SOCKET_EVENTS.BOOKING_STATUS_CHANGED, payload);
  emitToUser(postOwnerId,  SOCKET_EVENTS.BOOKING_STATUS_CHANGED, payload);
}

// ─── Platform settings helper ─────────────────────────────────────────────────
// Phase 8: consolidated into the cached config.service (was duplicated here).

const { getPlatformSetting: getSetting } = require('../config/config.service');

// ─── History helper ───────────────────────────────────────────────────────────

async function insertHistory(client, bookingId, fromStatus, toStatus, changedBy, reason, metadata) {
  await client.query(
    `INSERT INTO booking_status_history
       (booking_id, from_status, to_status, changed_by, reason, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      bookingId,
      fromStatus || null,
      toStatus,
      changedBy  || null,
      reason     || null,
      metadata   ? JSON.stringify(metadata) : null
    ]
  );
}

// ─── Response formatter ───────────────────────────────────────────────────────

function formatBooking(row) {
  return {
    id:                   row.id,
    postId:               row.post_id,
    requesterId:          row.requester_id,
    postOwnerId:          row.post_owner_id,
    status:               row.status,
    offeredPrice:         row.offered_price      ? parseFloat(row.offered_price)      : null,
    agreedPrice:          row.agreed_price       ? parseFloat(row.agreed_price)       : null,
    platformCommissionPct: row.platform_commission_pct ? parseFloat(row.platform_commission_pct) : null,
    platformCommissionAmt: row.platform_commission_amt ? parseFloat(row.platform_commission_amt) : null,
    netPayout:            row.net_payout         ? parseFloat(row.net_payout)         : null,
    pickupAddress:        row.pickup_address      || null,
    destinationAddress:   row.destination_address || null,
    scheduledDate:        row.scheduled_date      || null,
    goodsDescription:     row.goods_description   || null,
    specialInstructions:  row.special_instructions || null,
    paymentDeadline:      row.payment_deadline    || null,
    cancelledBy:          row.cancelled_by        || null,
    cancellationReason:   row.cancellation_reason || null,
    acceptedAt:           row.accepted_at         || null,
    rejectedAt:           row.rejected_at         || null,
    withdrawnAt:          row.withdrawn_at        || null,
    cancelledAt:          row.cancelled_at        || null,
    inProgressAt:         row.in_progress_at      || null,
    completedAt:          row.completed_at        || null,
    disputedAt:           row.disputed_at         || null,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
    // Joined data — presence check uses post_type (NOT NULL on any real post JOIN)
    post:       row.post_type ? {
      id:              row.post_id,
      postType:        row.post_type,
      originCity:      row.post_origin_city   || null,
      destinationCity: row.post_dest_city     || null
    } : undefined,
    requester:  row.requester_name ? {
      id:             row.requester_id,
      fullName:       row.requester_name,
      profileImageUrl: row.requester_avatar || null,
      rating:         parseFloat(row.requester_rating) || 0
    } : undefined,
    postOwner: row.owner_name ? {
      id:             row.post_owner_id,
      fullName:       row.owner_name,
      profileImageUrl: row.owner_avatar || null,
      rating:         parseFloat(row.owner_rating) || 0
    } : undefined,
    conversation: row.conversation_id ? { id: row.conversation_id } : undefined
  };
}

// ─── BASE SELECT ──────────────────────────────────────────────────────────────

const BOOKING_SELECT = `
  b.*,
  p.post_type,
  p.origin_city  AS post_origin_city,
  p.destination_city AS post_dest_city,
  p.origin_address AS post_title,
  r.full_name    AS requester_name,
  r.profile_image_url AS requester_avatar,
  r.rating       AS requester_rating,
  o.full_name    AS owner_name,
  o.profile_image_url AS owner_avatar,
  o.rating       AS owner_rating,
  c.id           AS conversation_id
`;

// ─── createBooking ────────────────────────────────────────────────────────────

async function createBooking(requesterId, data) {
  // 1. Load the post
  const postResult = await query(
    `SELECT id, user_id, status, post_type FROM posts
     WHERE id = $1 AND deleted_at IS NULL`,
    [data.post_id]
  );

  if (postResult.rows.length === 0) throw ApiError.notFound('Post');

  const post = postResult.rows[0];

  // 2. Cannot book own post
  if (post.user_id === requesterId) {
    throw new ApiError(422, 'You cannot send a booking request for your own post.', null, 'CANNOT_BOOK_OWN_POST');
  }

  // 3. Post must be active
  if (post.status !== POST_STATUS.ACTIVE) {
    throw new ApiError(422, `This post is currently "${post.status}" and is not accepting booking requests.`, null, 'POST_NOT_ACCEPTING_BOOKINGS');
  }

  // 4. Insert — DB partial unique index prevents duplicate active booking
  let bookingId;
  try {
    const result = await query(
      `INSERT INTO bookings
         (post_id, requester_id, post_owner_id,
          pickup_address, destination_address, scheduled_date,
          goods_description, special_instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        data.post_id,
        requesterId,
        post.user_id,
        data.pickup_address       || null,
        data.destination_address  || null,
        data.scheduled_date       || null,
        data.goods_description    || null,
        data.special_instructions || null
      ]
    );
    bookingId = result.rows[0].id;
  } catch (err) {
    if (err.code === '23505') {
      throw ApiError.conflict('You already have an active booking request for this post.');
    }
    throw err;
  }

  // 5. Insert initial status history
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await insertHistory(client, bookingId, null, BOOKING_STATUS.PENDING, requesterId, null, null);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 6. Notify post owner + emit realtime event
  emitToUser(post.user_id, SOCKET_EVENTS.BOOKING_STATUS_CHANGED, {
    bookingId, postId: data.post_id, status: BOOKING_STATUS.PENDING
  });

  setImmediate(() => notify({
    userId: post.user_id,
    type:   'booking_request_received',
    title:  'New booking request',
    body:   'You have received a new booking request for your post.',
    data:   { bookingId, postId: data.post_id }
  }));

  return getBookingById(bookingId, requesterId);
}

// ─── getBookings ──────────────────────────────────────────────────────────────

async function getBookings(userId, filters = {}) {
  const { role, status, page = 1, limit = 20 } = filters;

  const whereClauses = [];
  const params       = [];
  let   idx          = 1;

  // Filter by role
  if (role === 'requester') {
    whereClauses.push(`b.requester_id = $${idx++}`);
    params.push(userId);
  } else if (role === 'owner') {
    whereClauses.push(`b.post_owner_id = $${idx++}`);
    params.push(userId);
  } else {
    // Both roles — user appears as either party
    whereClauses.push(`(b.requester_id = $${idx} OR b.post_owner_id = $${idx})`);
    params.push(userId);
    idx++;
  }

  // Filter by status (comma-separated)
  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      whereClauses.push(`b.status = ANY($${idx++}::booking_status_enum[])`);
      params.push(statuses);
    }
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;
  const offset   = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM bookings b ${whereSQL}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await query(
    `SELECT ${BOOKING_SELECT}
     FROM bookings b
     JOIN posts p  ON p.id = b.post_id
     JOIN users r  ON r.id = b.requester_id
     JOIN users o  ON o.id = b.post_owner_id
     LEFT JOIN conversations c ON c.booking_id = b.id
     ${whereSQL}
     ORDER BY b.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    bookings: dataResult.rows.map(formatBooking),
    meta: {
      total,
      page:            parseInt(page, 10),
      limit:           parseInt(limit, 10),
      totalPages:      Math.ceil(total / limit),
      hasNextPage:     page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
}

// ─── getBookingById ───────────────────────────────────────────────────────────

async function getBookingById(bookingId, requestingUserId) {
  const result = await query(
    `SELECT ${BOOKING_SELECT}
     FROM bookings b
     JOIN posts p  ON p.id = b.post_id
     JOIN users r  ON r.id = b.requester_id
     JOIN users o  ON o.id = b.post_owner_id
     LEFT JOIN conversations c ON c.booking_id = b.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];

  // Only requester or post_owner may view the booking
  if (booking.requester_id !== requestingUserId && booking.post_owner_id !== requestingUserId) {
    throw ApiError.forbidden('You do not have permission to view this booking.');
  }

  return formatBooking(booking);
}

// ─── acceptBooking ────────────────────────────────────────────────────────────

async function acceptBooking(bookingId, postOwnerId, data) {
  const commissionPct = await getSetting('platform_commission_pct', 10);
  const deadlineHours = await getSetting('payment_deadline_hours', 24);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the booking row — prevents concurrent accept calls
    const bookingResult = await client.query(
      `SELECT b.id, b.status, b.post_id, b.requester_id, b.post_owner_id,
              p.post_type
       FROM bookings b
       JOIN posts p ON p.id = b.post_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw ApiError.notFound('Booking');
    }

    const booking = bookingResult.rows[0];

    if (booking.post_owner_id !== postOwnerId) {
      await client.query('ROLLBACK');
      throw ApiError.forbidden('Only the post owner can accept booking requests.');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      await client.query('ROLLBACK');
      throw new ApiError(422, `Cannot accept a booking that is currently "${booking.status}".`, null, 'INVALID_STATUS_TRANSITION');
    }

    const isNeedTransport = booking.post_type === POST_TYPES.NEED_TRANSPORT;

    // Calculate commission split
    const agreedPrice     = parseFloat(data.agreed_price);
    const commissionAmt   = parseFloat((agreedPrice * commissionPct / 100).toFixed(2));
    const netPayout       = parseFloat((agreedPrice - commissionAmt).toFixed(2));
    const paymentDeadline = new Date(Date.now() + deadlineHours * 3600 * 1000);

    // Update booking status
    await client.query(
      `UPDATE bookings SET
         status = 'accepted',
         agreed_price = $1,
         platform_commission_pct = $2,
         platform_commission_amt = $3,
         net_payout = $4,
         payment_deadline = $5,
         accepted_at = NOW(),
         pickup_address = COALESCE($6, pickup_address),
         destination_address = COALESCE($7, destination_address),
         scheduled_date = COALESCE($8, scheduled_date),
         special_instructions = COALESCE($9, special_instructions)
       WHERE id = $10`,
      [
        agreedPrice, commissionPct, commissionAmt, netPayout, paymentDeadline,
        data.pickup_address || null,
        data.destination_address || null,
        data.scheduled_date || null,
        data.special_instructions || null,
        bookingId
      ]
    );

    let otherBookings = { rows: [] };

    if (isNeedTransport) {
      // Single-capacity: lock the post and auto-reject all other pending requests.
      await client.query(
        `UPDATE posts SET status = 'booked' WHERE id = $1`,
        [booking.post_id]
      );

      otherBookings = await client.query(
        `UPDATE bookings SET status = 'rejected', rejected_at = NOW()
         WHERE post_id = $1 AND id != $2 AND status = 'pending'
         RETURNING id, requester_id`,
        [booking.post_id, bookingId]
      );

      // History for auto-rejected bookings
      for (const other of otherBookings.rows) {
        await insertHistory(
          client, other.id,
          BOOKING_STATUS.PENDING, BOOKING_STATUS.REJECTED,
          null, 'Auto-rejected: another booking was accepted for this post', null
        );
      }
    }
    // Vehicle-Available / Return-Journey: post stays 'active' so more shippers
    // can book until the transporter chooses to close it. No auto-reject.

    // History for accepted booking
    await insertHistory(
      client, bookingId,
      BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED,
      postOwnerId, null,
      { agreed_price: agreedPrice, commission_pct: commissionPct }
    );

    // Create conversation
    const convResult = await client.query(
      `INSERT INTO conversations (booking_id, participant_1_id, participant_2_id, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING id`,
      [bookingId, booking.requester_id, postOwnerId]
    );

    // Insert system message in conversation
    if (convResult.rows.length > 0) {
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type)
         VALUES ($1, NULL, 'Booking accepted. You can now chat about the details.', 'system')`,
        [convResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    // Realtime: notify both parties of status change
    emitBookingStatusChanged(
      booking.requester_id, postOwnerId,
      bookingId, booking.post_id, BOOKING_STATUS.ACCEPTED
    );
    if (isNeedTransport) {
      emitToUser(postOwnerId, SOCKET_EVENTS.POST_STATUS_CHANGED, {
        postId: booking.post_id, status: POST_STATUS.BOOKED
      });
    }

    // Notifications (fire-and-forget after commit)
    setImmediate(async () => {
      // Notify requester their booking was accepted
      await notify({
        userId: booking.requester_id,
        type:   'booking_accepted',
        title:  'Booking request accepted!',
        body:   `Your booking was accepted at ₹${agreedPrice.toLocaleString('en-IN')}.`,
        data:   { bookingId, postId: booking.post_id }
      });

      // Notify requesters of other auto-rejected bookings (Need-Transport only)
      for (const other of otherBookings.rows) {
        await notify({
          userId: other.requester_id,
          type:   'booking_rejected',
          title:  'Booking request not selected',
          body:   'Another booking was accepted for this post. Your request was not selected.',
          data:   { bookingId: other.id, postId: booking.post_id }
        });
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getBookingById(bookingId, postOwnerId);
}

// ─── rejectBooking ────────────────────────────────────────────────────────────

async function rejectBooking(bookingId, postOwnerId, reason) {
  const result = await query(
    `SELECT id, status, post_id, requester_id, post_owner_id FROM bookings WHERE id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];
  if (booking.post_owner_id !== postOwnerId) throw ApiError.forbidden('Only the post owner can reject a booking.');
  if (booking.status !== BOOKING_STATUS.PENDING) {
    throw new ApiError(422, `Cannot reject a booking that is currently "${booking.status}".`, null, 'INVALID_STATUS_TRANSITION');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings SET status = 'rejected', rejected_at = NOW() WHERE id = $1`,
      [bookingId]
    );
    await insertHistory(client, bookingId, BOOKING_STATUS.PENDING, BOOKING_STATUS.REJECTED, postOwnerId, reason, null);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emitBookingStatusChanged(
    booking.requester_id, booking.post_owner_id,
    bookingId, booking.post_id, BOOKING_STATUS.REJECTED
  );

  setImmediate(() => notify({
    userId: booking.requester_id,
    type:   'booking_rejected',
    title:  'Booking request not accepted',
    body:   'Your booking request was not accepted by the post owner.',
    data:   { bookingId, postId: booking.post_id }
  }));
}

// ─── withdrawBooking ──────────────────────────────────────────────────────────

async function withdrawBooking(bookingId, requesterId) {
  const result = await query(
    `SELECT id, status, post_id, requester_id, post_owner_id FROM bookings WHERE id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];
  if (booking.requester_id !== requesterId) throw ApiError.forbidden('Only the requester can withdraw a booking request.');
  if (booking.status !== BOOKING_STATUS.PENDING) {
    throw new ApiError(422, `Cannot withdraw a booking that is currently "${booking.status}".`, null, 'INVALID_STATUS_TRANSITION');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings SET status = 'withdrawn', withdrawn_at = NOW() WHERE id = $1`,
      [bookingId]
    );
    await insertHistory(client, bookingId, BOOKING_STATUS.PENDING, BOOKING_STATUS.WITHDRAWN, requesterId, 'Withdrawn by requester', null);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emitBookingStatusChanged(
    booking.requester_id, booking.post_owner_id,
    bookingId, booking.post_id, BOOKING_STATUS.WITHDRAWN
  );
}

// ─── cancelBooking ────────────────────────────────────────────────────────────

async function cancelBooking(bookingId, userId, reason) {
  const result = await query(
    `SELECT id, status, post_id, requester_id, post_owner_id FROM bookings WHERE id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];
  const isParty = booking.requester_id === userId || booking.post_owner_id === userId;
  if (!isParty) throw ApiError.forbidden('You are not a participant in this booking.');

  const cancellableStatuses = [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.IN_PROGRESS];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new ApiError(422, `Cannot cancel a booking that is currently "${booking.status}".`, null, 'INVALID_STATUS_TRANSITION');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings SET
         status = 'cancelled', cancelled_at = NOW(),
         cancelled_by = $1, cancellation_reason = $2
       WHERE id = $3`,
      [userId, reason, bookingId]
    );

    // Re-open the post if it was booked
    await client.query(
      `UPDATE posts SET status = 'active'
       WHERE id = $1 AND status = 'booked'`,
      [booking.post_id]
    );

    // Lock the conversation
    await client.query(
      `UPDATE conversations SET status = 'locked' WHERE booking_id = $1`,
      [bookingId]
    );

    await insertHistory(client, bookingId, booking.status, BOOKING_STATUS.CANCELLED, userId, reason, null);

    // Increment cancellation count for the cancelling user
    await client.query(
      `UPDATE users SET cancellation_count = cancellation_count + 1 WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emitBookingStatusChanged(
    booking.requester_id, booking.post_owner_id,
    bookingId, booking.post_id, BOOKING_STATUS.CANCELLED
  );
  emitToUser(booking.post_owner_id, SOCKET_EVENTS.POST_STATUS_CHANGED, {
    postId: booking.post_id, status: POST_STATUS.ACTIVE
  });

  const otherUserId = userId === booking.requester_id ? booking.post_owner_id : booking.requester_id;
  setImmediate(() => notify({
    userId: otherUserId,
    type:   'booking_cancelled',
    title:  'A booking has been cancelled',
    body:   `A booking was cancelled. Reason: ${reason}`,
    data:   { bookingId, postId: booking.post_id }
  }));
}

// ─── markInProgress ──────────────────────────────────────────────────────────

async function markInProgress(bookingId, actorId) {
  const result = await query(
    `SELECT b.id, b.status, b.post_id, b.requester_id, b.post_owner_id, p.post_type
     FROM bookings b
     JOIN posts p ON p.id = b.post_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];

  // For Need-Transport: the transporter is the requester — they mark pickup.
  // For Vehicle-Available / Return-Journey: the transporter is the post owner.
  const isNeedTransport = booking.post_type === POST_TYPES.NEED_TRANSPORT;
  const validActor = isNeedTransport ? booking.requester_id : booking.post_owner_id;

  if (actorId !== validActor) {
    const who = isNeedTransport ? 'the transporter (requester)' : 'the post owner (transporter)';
    throw ApiError.forbidden(`Only ${who} can mark a booking as in progress.`);
  }

  if (booking.status !== BOOKING_STATUS.ACCEPTED) {
    throw new ApiError(422, `Cannot mark as in-progress when booking is "${booking.status}".`, null, 'INVALID_STATUS_TRANSITION');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings SET status = 'in_progress', in_progress_at = NOW() WHERE id = $1`,
      [bookingId]
    );
    await insertHistory(client, bookingId, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.IN_PROGRESS, actorId, null, null);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emitBookingStatusChanged(
    booking.requester_id, booking.post_owner_id,
    bookingId, booking.post_id, BOOKING_STATUS.IN_PROGRESS
  );
}

// ─── completeBooking ─────────────────────────────────────────────────────────

async function completeBooking(bookingId, actorId) {
  const result = await query(
    `SELECT b.id, b.status, b.post_id, b.requester_id, b.post_owner_id, p.post_type
     FROM bookings b
     JOIN posts p ON p.id = b.post_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];

  // The Shipper confirms completion. For Need-Transport, shipper = post_owner.
  // For Vehicle-Available / Return-Journey, shipper = requester.
  const isNeedTransport = booking.post_type === POST_TYPES.NEED_TRANSPORT;
  const validActor = isNeedTransport ? booking.post_owner_id : booking.requester_id;

  if (actorId !== validActor) {
    const who = isNeedTransport ? 'the shipper (post owner)' : 'the shipper (requester)';
    throw ApiError.forbidden(`Only ${who} can confirm completion of this booking.`);
  }

  if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
    throw new ApiError(422, `Cannot complete a booking that is currently "${booking.status}".`, null, 'INVALID_STATUS_TRANSITION');
  }

  const autoReleaseDays = await getSetting('payment_auto_release_days', 7);
  const autoReleaseAt   = new Date(Date.now() + autoReleaseDays * 24 * 3600 * 1000);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE bookings SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    // Mark post as completed
    await client.query(
      `UPDATE posts SET status = 'completed' WHERE id = $1`,
      [booking.post_id]
    );

    // Archive conversation
    await client.query(
      `UPDATE conversations SET status = 'archived' WHERE booking_id = $1`,
      [bookingId]
    );

    // Set payment auto-release date
    await client.query(
      `UPDATE payments SET auto_release_at = $1
       WHERE booking_id = $2 AND status = 'completed'`,
      [autoReleaseAt, bookingId]
    );

    await insertHistory(client, bookingId, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED, actorId, null, null);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emitBookingStatusChanged(
    booking.requester_id, booking.post_owner_id,
    bookingId, booking.post_id, BOOKING_STATUS.COMPLETED
  );
  emitToUser(booking.post_owner_id, SOCKET_EVENTS.POST_STATUS_CHANGED, {
    postId: booking.post_id, status: POST_STATUS.COMPLETED
  });

  setImmediate(async () => {
    await notify({
      userId: booking.requester_id,
      type:   'booking_completed',
      title:  'Delivery completed!',
      body:   'Your booking has been marked as complete. Please leave a review.',
      data:   { bookingId, postId: booking.post_id }
    });
    await notify({
      userId: booking.post_owner_id,
      type:   'booking_completed',
      title:  'Booking marked complete',
      body:   'The booking has been completed. Payment will be released shortly.',
      data:   { bookingId, postId: booking.post_id }
    });
  });
}

// ─── raiseDispute ─────────────────────────────────────────────────────────────

async function raiseDispute(bookingId, userId, reason, description) {
  const result = await query(
    `SELECT id, status, post_id, requester_id, post_owner_id FROM bookings WHERE id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) throw ApiError.notFound('Booking');

  const booking = result.rows[0];
  const isParty = booking.requester_id === userId || booking.post_owner_id === userId;
  if (!isParty) throw ApiError.forbidden('You are not a participant in this booking.');

  const disputeAllowed = [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED];
  if (!disputeAllowed.includes(booking.status)) {
    throw new ApiError(422, `Disputes can only be raised on in-progress or completed bookings.`, null, 'INVALID_STATUS_TRANSITION');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE bookings SET status = 'disputed', disputed_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    await client.query(
      `INSERT INTO disputes (booking_id, raised_by, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [bookingId, userId, reason, description]
    );

    await insertHistory(client, bookingId, booking.status, BOOKING_STATUS.DISPUTED, userId, reason, null);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emitBookingStatusChanged(
    booking.requester_id, booking.post_owner_id,
    bookingId, booking.post_id, BOOKING_STATUS.DISPUTED
  );

  const otherUserId = userId === booking.requester_id ? booking.post_owner_id : booking.requester_id;
  setImmediate(() => notify({
    userId: otherUserId,
    type:   'dispute_raised',
    title:  'A dispute has been raised',
    body:   'The other party has raised a dispute on this booking. Our team will review it.',
    data:   { bookingId, postId: booking.post_id }
  }));
}

// ─── getBookingHistory ────────────────────────────────────────────────────────

async function getBookingHistory(bookingId, userId) {
  // Verify access
  const bookingCheck = await query(
    'SELECT requester_id, post_owner_id FROM bookings WHERE id = $1',
    [bookingId]
  );
  if (bookingCheck.rows.length === 0) throw ApiError.notFound('Booking');

  const b = bookingCheck.rows[0];
  if (b.requester_id !== userId && b.post_owner_id !== userId) {
    throw ApiError.forbidden('You do not have access to this booking history.');
  }

  const result = await query(
    `SELECT
       bsh.id, bsh.from_status, bsh.to_status,
       bsh.reason, bsh.metadata, bsh.created_at,
       u.full_name AS changed_by_name
     FROM booking_status_history bsh
     LEFT JOIN users u ON u.id = bsh.changed_by
     WHERE bsh.booking_id = $1
     ORDER BY bsh.created_at ASC`,
    [bookingId]
  );

  return result.rows.map((row) => ({
    id:            row.id,
    fromStatus:    row.from_status || null,
    toStatus:      row.to_status,
    reason:        row.reason || null,
    metadata:      row.metadata || null,
    changedBy:     row.changed_by_name || 'System',
    createdAt:     row.created_at
  }));
}

// ─── getPostBookings (replaces stub in posts.service) ────────────────────────

async function getPostBookings(postId, postOwnerId, filters = {}) {
  const { page = 1, limit = 20 } = filters;

  // Verify ownership
  const postCheck = await query(
    'SELECT id, user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
    [postId]
  );
  if (postCheck.rows.length === 0) throw ApiError.notFound('Post');
  if (postCheck.rows[0].user_id !== postOwnerId) {
    throw ApiError.forbidden('Only the post owner can view booking requests for this post.');
  }

  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) AS total FROM bookings WHERE post_id = $1',
    [postId]
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await query(
    `SELECT ${BOOKING_SELECT}
     FROM bookings b
     JOIN posts p ON p.id = b.post_id
     JOIN users r ON r.id = b.requester_id
     JOIN users o ON o.id = b.post_owner_id
     LEFT JOIN conversations c ON c.booking_id = b.id
     WHERE b.post_id = $1
     ORDER BY b.created_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );

  return {
    bookings: dataResult.rows.map(formatBooking),
    meta: {
      total,
      page:            parseInt(page, 10),
      limit:           parseInt(limit, 10),
      totalPages:      Math.ceil(total / limit),
      hasNextPage:     page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  withdrawBooking,
  cancelBooking,
  markInProgress,
  completeBooking,
  raiseDispute,
  getBookingHistory,
  getPostBookings
};