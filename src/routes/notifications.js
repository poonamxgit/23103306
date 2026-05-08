const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

// GET /notifications - List notifications with pagination and filters
router.get('/', (req, res) => {
  const { userId, limit = 50, offset = 0, unreadOnly = false, sort = 'timestamp' } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId parameter is required' });
  }

  const result = Notification.getAllNotifications(
    userId,
    parseInt(limit),
    parseInt(offset),
    unreadOnly === 'true',
    sort
  );

  res.json(result);
});

// GET /notifications/:id - Get single notification by ID
router.get('/:id', (req, res) => {
  const notification = Notification.getNotificationById(req.params.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json(notification);
});

// POST /notifications - Create new notification
router.post('/', (req, res) => {
  const { userId, type, message, timestamp, priorityWeight, metadata } = req.body;

  if (!userId || !type || !message) {
    return res.status(400).json({ error: 'userId, type, and message are required' });
  }

  const notification = Notification.createNotification({
    userId,
    type,
    message,
    timestamp,
    priorityWeight,
    metadata,
  });

  // Broadcast to WebSocket clients
  if (global.wsNotifications) {
    global.wsNotifications.forEach(ws => {
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify({
          event: 'new_notification',
          data: notification,
        }));
      }
    });
  }

  res.status(201).json(notification);
});

// PATCH /notifications/:id/read - Mark notification as read
router.patch('/:id/read', (req, res) => {
  const { isRead = true } = req.body;
  const notification = Notification.markAsRead(req.params.id, isRead);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  // Broadcast update to WebSocket clients
  if (global.wsNotifications) {
    global.wsNotifications.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          event: 'notification_updated',
          data: notification,
        }));
      }
    });
  }

  res.json(notification);
});

// GET /notifications/priority - Get top priority unread notifications
router.get('/priority/list', (req, res) => {
  const { userId, limit = 10 } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId parameter is required' });
  }

  const result = Notification.getPriorityNotifications(userId, parseInt(limit));
  res.json(result);
});

// GET /notifications/summary - Get summary statistics
router.get('/summary/data', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId parameter is required' });
  }

  const summary = Notification.getSummary(userId);
  res.json(summary);
});

module.exports = router;
