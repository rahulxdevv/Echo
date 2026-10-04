const MessageTracker = require('../models/MessageTracker');
const BlacklistedChannel = require('../models/BlacklistedChannel');

async function getOrCreateMessageTracker(guildId, userId, username) {
  let tracker = await MessageTracker.findOne({ guildId, userId });

  if (!tracker) {
    tracker = await MessageTracker.create({
      guildId,
      userId,
      username,
      messageCount: 0
    });
  } else if (tracker.username !== username) {
    tracker.username = username;
    await tracker.save();
  }

  return tracker;
}

async function incrementMessageCount(guildId, userId, username) {
  const tracker = await getOrCreateMessageTracker(guildId, userId, username);
  tracker.messageCount += 1;
  tracker.lastMessageAt = new Date();
  await tracker.save();
  return tracker;
}

async function getMessageStats(guildId, userId) {
  const tracker = await MessageTracker.findOne({ guildId, userId });
  return tracker ? tracker.messageCount : 0;
}

async function getTopMessagers(guildId, limit = 10) {
  const trackers = await MessageTracker.find({ guildId })
    .sort({ messageCount: -1 })
    .limit(limit);

  return trackers.map(tracker => ({
    userId: tracker.userId,
    username: tracker.username,
    count: tracker.messageCount
  }));
}

async function addMessages(guildId, userId, username, amount) {
  const tracker = await getOrCreateMessageTracker(guildId, userId, username);
  tracker.messageCount += amount;
  await tracker.save();
  return tracker;
}

async function removeMessages(guildId, userId, amount) {
  const tracker = await MessageTracker.findOne({ guildId, userId });

  if (!tracker) {
    return null;
  }

  tracker.messageCount = Math.max(0, tracker.messageCount - amount);
  await tracker.save();
  return tracker;
}

async function clearMessages(guildId, userId = null) {
  if (userId) {
    const result = await MessageTracker.deleteOne({ guildId, userId });
    return result.deletedCount;
  } else {
    const result = await MessageTracker.deleteMany({ guildId });
    return result.deletedCount;
  }
}

async function isChannelBlacklisted(guildId, channelId) {
  const blacklisted = await BlacklistedChannel.findOne({ guildId, channelId });
  return !!blacklisted;
}

async function blacklistChannel(guildId, channelId, channelName, blacklistedBy) {
  const existing = await BlacklistedChannel.findOne({ guildId, channelId });

  if (existing) {
    return { success: false, message: 'Channel is already blacklisted.' };
  }

  await BlacklistedChannel.create({
    guildId,
    channelId,
    channelName,
    blacklistedBy
  });

  return { success: true, message: 'Channel blacklisted successfully.' };
}

async function unblacklistChannel(guildId, channelId = null) {
  if (channelId) {
    const result = await BlacklistedChannel.deleteOne({ guildId, channelId });
    return result.deletedCount;
  } else {
    const result = await BlacklistedChannel.deleteMany({ guildId });
    return result.deletedCount;
  }
}

async function getBlacklistedChannels(guildId) {
  const channels = await BlacklistedChannel.find({ guildId }).sort({ blacklistedAt: -1 });
  return channels;
}

module.exports = {
  getOrCreateMessageTracker,
  incrementMessageCount,
  getMessageStats,
  getTopMessagers,
  addMessages,
  removeMessages,
  clearMessages,
  isChannelBlacklisted,
  blacklistChannel,
  unblacklistChannel,
  getBlacklistedChannels
};
