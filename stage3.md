# Stage 3

## Query Review

The given query is:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Is it accurate?
Yes, it correctly fetches unread notifications for the student and orders them by recency.

### Why it can be slow
- `SELECT *` reads all columns even if not needed
- no supporting index causes a full table scan
- sorting by `createdAt DESC` is expensive without an index

### What to change

1. Add an index:
```sql
CREATE INDEX idx_notifications_student_unread_created
  ON notifications (studentID, isRead, createdAt DESC);
```

2. Select only needed fields:
```sql
SELECT id, notificationType, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 50;
```

3. Add pagination to avoid huge result sets.

### Is indexing every column safe?
No. Index every column only when it supports an important query.
A composite index on `(studentID, isRead, createdAt)` is the right choice.

### Placement notification query

```sql
SELECT *
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= now() - interval '7 days';
```

If the actual schema uses snake_case:
```sql
SELECT *
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= now() - interval '7 days';
```
