const Content = require('../models/Content');

async function publishScheduledContents() {
  const now = new Date();
  const result = await Content.updateMany(
    { status: 'Scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'Published', publishedAt: now } },
  );
  if (result.modifiedCount) {
    console.log(`Published ${result.modifiedCount} scheduled item(s).`);
  }
}

module.exports = publishScheduledContents;
