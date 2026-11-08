const Notification = require('../models/Notification');

async function createNotification({ actor, content, type, message, eventKey }) {
  const recipientEmail = (process.env.CREATOR_EMAIL || 'ariesavy9@gmail.com').trim().toLowerCase();
  return Notification.create({
    recipientEmail,
    actorId: String(actor.id || ''),
    actorName: String(actor.name || 'A viewer').trim().slice(0, 80),
    content: content._id,
    contentTitle: String(content.title || 'Untitled content').trim().slice(0, 140),
    type,
    message,
    ...(eventKey ? { eventKey } : {}),
  });
}

module.exports = createNotification;
