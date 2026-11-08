const Notification = require('../models/Notification');

function creatorEmail() {
  return (process.env.CREATOR_EMAIL || 'ariesavy9@gmail.com').trim().toLowerCase();
}

function recipientFilter(req) {
  return req.authUser.role === 'creator'
    ? { recipientEmail: creatorEmail() }
    : { recipientId: String(req.authUser.id) };
}

async function listNotifications(req, res, next) {
  try {
    const filter = recipientFilter(req);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ ...filter, readAt: null }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...recipientFilter(req) },
      { $set: { readAt: new Date() } },
      { new: true },
    ).lean();
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.json({ notification });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { ...recipientFilter(req), readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listNotifications, markNotificationRead, markAllNotificationsRead };
