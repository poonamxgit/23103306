# Stage 2

## Database Recommendation

I recommend PostgreSQL for this notification system.

### Why PostgreSQL
- Strong relational schema support
- Good indexing and query optimization
- Easy support for JSON metadata
- Works well for unread counts and prioritized queries

### Schema Design

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

### Scaling Problems

Potential issues as volume grows:
- unread scans become expensive
- writes slow with many indexes
- sorting large datasets is costly

### Solutions

- use composite indexes for common queries
- store unread counts in a summary table or cache
- partition data by time if the table grows very large
- use Redis for hot unread notification lists

### Example Queries

Unread notifications:
```sql
SELECT id, notification_type, message, created_at, weight
FROM notifications
WHERE user_id = $1 AND is_read = false
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

Top prioritized notifications:
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
