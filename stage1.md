# Stage 1

## Notification API Design

### Core Endpoints

- `GET /notifications`
  - Parameters: `userId`, `limit`, `offset`, `unreadOnly`, `sort`
  - Returns a list of notifications with pagination and unread counts.

- `GET /notifications/{id}`
  - Returns one notification by ID.

- `POST /notifications`
  - Creates a new notification record.

- `PATCH /notifications/{id}/read`
  - Marks a notification as read.

- `GET /notifications/priority`
  - Returns the top `n` highest-priority unread notifications.

- `GET /notifications/summary`
  - Returns counts and summary data for the user.

### JSON Contracts

#### GET /notifications response
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

#### GET /notifications/priority response
```json
{
  "notifications": [ ... ]
}
```

#### POST /notifications request
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

#### PATCH /notifications/{id}/read request
```json
{ "isRead": true }
```

### Real-time Notifications

- Use WebSockets or Server-Sent Events to push new notifications to clients.
- Example: `ws://<host>/notifications/stream?userId=<userId>`
- This keeps the inbox updated without reloading the page.

### Summary

Stage 1 defines the API contract for notification retrieval, creation, read state updates, and real-time delivery.
