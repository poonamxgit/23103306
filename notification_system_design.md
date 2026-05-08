# Notification System Design

## Stage 1

### API Design

The notification platform should expose the following endpoints:

- `GET /notifications` — fetch current notifications for a user
- `GET /notifications/{id}` — fetch a single notification by ID
- `POST /notifications` — create a new notification
- `PATCH /notifications/{id}/read` — mark a notification as read
- `GET /notifications/priority` — fetch the top `n` highest-priority unread notifications
- `GET /notifications/summary` — fetch unread counts and priority summary

### Request / Response Contracts

#### GET /notifications
Request query parameters:
- `userId` (required)
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)
- `unreadOnly` (optional boolean)
- `sort` (optional, default: `createdAt:desc`)

Response:
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Result",
      "message": "mid-sem",
      "timestamp": "2026-04-22T17:51:30Z",
      "isRead": false,
      "priorityWeight": 4
    }
  ],
  "total": 128,
  "unread": 42
}
```

#### GET /notifications/priority
Request query parameters:
- `userId` (required)
- `limit` (optional, default: 10)

Response:
```json
{
  "notifications": [ ... ]
}
```

#### POST /notifications
Request body:
```json
{
  "userId": "1042",
  "type": "Placement",
  "message": "CSX Corporation hiring",
  "timestamp": "2026-04-22T17:51:18",
  "notificationType": "Placement",
  "metadata": { "source": "placement-service" }
}
```

Response:
```json
{
  "id": "...",
  "createdAt": "..."
}
```

#### PATCH /notifications/{id}/read
Request body:
```json
{ "isRead": true }
```

Response:
```json
{ "success": true }
```

### Real-time Notifications

Design should include WebSocket or server-sent events.
A backend real-time service can push events to connected clients when a notification is created.
Clients subscribe to `ws://.../notifications/stream?userId=<user>` or SSE endpoint.

## Stage 2

### Database Choice

I recommend a relational database such as PostgreSQL for the notification system.

Reasons:
- structured relational data with clear schema requirements
- strong query guarantees for unread counts, priority inbox, and indexing
- easy to use for analytics and reporting

An alternate NoSQL choice like MongoDB would also work, but relational SQL is simpler for the given queries and prioritized ordering requirements.

### Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  weight INT NOT NULL,
  source TEXT,
  metadata JSONB
);

CREATE INDEX idx_notifications_user_unread_created ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_weight_created ON notifications (user_id, weight DESC, created_at DESC);
```

### Data volume problems and solutions

As notifications grow, key problems are:
- large unread scans on every page load
- high write volume during broadcast events
- slow sorting on large notification sets

Solutions:
- use indexes on `(user_id, is_read, created_at)` and `(user_id, weight, created_at)`
- store unread counts in a dedicated summary table or cache
- partition older notifications by date if scale grows very large
- keep recent notifications in memory or Redis for hot users

### Example queries

Unread notifications by user:
```sql
SELECT id, notification_type, message, created_at, weight
FROM notifications
WHERE user_id = $1 AND is_read = false
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

Top prioritized inbox:
```sql
SELECT id, notification_type, message, created_at, weight
FROM notifications
WHERE user_id = $1 AND is_read = false
ORDER BY weight DESC, created_at DESC
LIMIT $2;
```

Insert notification:
```sql
INSERT INTO notifications (id, user_id, notification_type, message, created_at, is_read, weight, source, metadata)
VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8);
```

## Stage 3

### Query analysis

The query in the screenshot is:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

This query is correct logically, but may be slow at scale without proper indexing.

### Why it is slow

- `SELECT *` reads all columns when only a subset is needed
- filtering on `studentID` and `isRead` requires an index to avoid full table scans
- sorting by `createdAt DESC` over many rows is expensive without a supporting index

### Improvements

1. Use a composite index:
```sql
CREATE INDEX idx_notifications_student_unread_created
  ON notifications (studentID, isRead, createdAt DESC);
```

2. Avoid `SELECT *` if you only need a few fields:
```sql
SELECT id, notificationType, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 50;
```

3. Add pagination:
```sql
LIMIT 50 OFFSET 0
```

4. If the table is large, maintain a materialized view or cache for unread notifications.

### Indexing advice

Do not index every column.
- Index the query’s filter and order columns instead: `(studentID, isRead, createdAt)`.
- Avoid indexes on low-cardinality columns alone unless they support a common query.
- Too many indexes slow writes.

### Placement notification query

Fetch all placement notification rows in the last 7 days:
```sql
SELECT *
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= now() - interval '7 days';
```

If the column is lowercase or different:
```sql
SELECT *
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= now() - interval '7 days';
```

## Stage 4

### Performance improvement ideas

The DB is overwhelmed if notifications load on every page request.
Better strategies:

- Client-side caching: refresh only when a new notification arrives.
- Pagination + infinite scroll: fetch a small page of notifications.
- Server-side caching: use Redis for recent unread notifications or counts.
- Push updates: use WebSockets/SSE so the browser updates incrementally.

### Tradeoffs

- Cache adds complexity and possible staleness.
- Pagination reduces load but requires cursor management.
- WebSocket real-time updates improve UX but need connection handling.
- Redis improves speed but adds another operational layer.

## Stage 5

### Shortcomings of naive notify-all pseudocode

The naive loop:
```
for student_id in student_ids:
  send_email(student_id, message)
  save_to_db(student_id, message)
  push_to_app(student_id, message)
```

Problems:
- synchronous, slow for 50,000 students
- single failure can stop the whole process
- email failure does not retry intelligently
- DB save and email are tightly coupled

### Reliable redesign

Use asynchronous jobs and batching:

1. Enqueue a notification job for each student in a queue service.
2. Worker processes jobs separately for email and app notifications.
3. Save notification data first or in a separate queue with an idempotent write.
4. If email fails, retry with exponential backoff.

### Recommended pseudocode

```python
function notify_all(student_ids, message):
  job = create_notification_job_batch(student_ids, message)
  enqueue('notification-batch', job)

worker process_notification_batch(job):
  for student_id in job.student_ids:
    notification = create_notification_record(student_id, job.message)
    enqueue('email-send', { student_id, notification.id, message })
    enqueue('realtime-push', { student_id, notification.id, message })
```

### Why this is better

- decouples email, DB, and realtime push
- allows retries on failures
- scales across many workers
- keeps the system responsive

## Stage 6

### Priority inbox algorithm

Priority is based on notification type weight and recency.

Define a score:
```
score = weight * 0.7 + recency_score * 0.3
```
Where recency_score is normalized by time since creation.

### Efficient approach

Use a min-heap of size `n` to maintain the top notifications as new ones arrive.

Example in JavaScript:
```javascript
function topNotifications(notifications, n) {
  const compare = (a, b) => (a.score - b.score);
  const heap = new MinHeap(compare);

  for (const notification of notifications) {
    notification.score = notification.weight * 10 + (Date.now() - new Date(notification.timestamp)) * -0.001;
    if (heap.size() < n) {
      heap.push(notification);
    } else if (compare(notification, heap.peek()) > 0) {
      heap.pop();
      heap.push(notification);
    }
  }

  return heap.toArray().sort((a, b) => b.score - a.score);
}
```

### Keeping the top-10 efficiently

- use a fixed-size priority queue
- update only when new notifications arrive
- store the latest `top_n` in Redis or a small cache for each user

### Implementation summary

This file describes a full notification API design, database schema, query optimizations, real-time delivery, reliable batch notifications, and priority sorting. The service can be implemented in Node.js/Express with PostgreSQL or a similar relational store.
