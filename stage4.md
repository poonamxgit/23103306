# Stage 4

## Performance Improvements for Notification Fetch

The problem: notifications are fetched on every page load and the database gets overwhelmed.

### Recommended strategies

1. Pagination
   - Fetch only a limited page of notifications.
   - Example:
   ```sql
   SELECT id, notification_type, message, created_at, weight
   FROM notifications
   WHERE user_id = $1 AND is_read = false
   ORDER BY created_at DESC
   LIMIT 20 OFFSET $2;
   ```

2. Caching
   - Use Redis or in-memory cache for recent unread counts and top notifications.
   - Store user summary data separately: unread counts, top priority IDs.

3. Real-time updates
   - Use WebSocket/SSE so the client receives only new notifications.
   - Avoid full reload on every page open.

4. Background precomputation
   - Maintain a small cache of top notifications per user.
   - Recompute only when new notifications arrive, not on every read.

### Tradeoffs

- Cache consistency vs performance
  - Cache can be stale, so always refresh incrementally or with a TTL.
- More infrastructure vs simpler design
  - Redis adds complexity but reduces DB load.
- Pagination improves scaling but requires cursor/offset logic.

### Best-fit approach

- Use DB indexes for core queries.
- Add a Redis layer for hot queries and unread counts.
- Push notification changes in real time rather than polling.

### Example architecture

- Primary DB: PostgreSQL for persistence
- Cache layer: Redis for unread summary and top notification IDs
- Real-time channel: WebSocket or SSE for active clients
- API server: Node.js/Express with logging middleware

### Summary

Stage 4 focuses on reducing repeated database load by using pagination, caching, and real-time updates. This improves user experience and keeps the notification system responsive under high load.
