const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '../db/notifications.json');

class Notification {
  static readDB() {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return { notifications: [] };
    }
  }

  static writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  }

  static getAllNotifications(userId, limit = 50, offset = 0, unreadOnly = false, sort = 'timestamp') {
    const db = this.readDB();
    let notifications = db.notifications.filter(n => n.userId === userId);

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    // Sort by specified field
    notifications.sort((a, b) => {
      if (sort === 'timestamp') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else if (sort === 'priority') {
        return b.priorityWeight - a.priorityWeight;
      }
      return 0;
    });

    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const paginatedNotifications = notifications.slice(offset, offset + limit);

    return {
      notifications: paginatedNotifications,
      total,
      unread,
    };
  }

  static getNotificationById(id) {
    const db = this.readDB();
    return db.notifications.find(n => n.id === id);
  }

  static createNotification(data) {
    const db = this.readDB();
    const notification = {
      id: uuidv4(),
      userId: data.userId,
      type: data.type,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
      isRead: false,
      priorityWeight: data.priorityWeight || 1,
      metadata: data.metadata || {},
    };
    db.notifications.push(notification);
    this.writeDB(db);
    return notification;
  }

  static markAsRead(id, isRead = true) {
    const db = this.readDB();
    const notification = db.notifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = isRead;
      this.writeDB(db);
      return notification;
    }
    return null;
  }

  static getPriorityNotifications(userId, limit = 10) {
    const db = this.readDB();
    const notifications = db.notifications
      .filter(n => n.userId === userId && !n.isRead)
      .sort((a, b) => b.priorityWeight - a.priorityWeight)
      .slice(0, limit);

    return { notifications };
  }

  static getSummary(userId) {
    const db = this.readDB();
    const userNotifications = db.notifications.filter(n => n.userId === userId);
    const unread = userNotifications.filter(n => !n.isRead).length;
    const total = userNotifications.length;

    const typeCounts = {};
    userNotifications.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    return {
      total,
      unread,
      byType: typeCounts,
    };
  }
}

module.exports = Notification;
