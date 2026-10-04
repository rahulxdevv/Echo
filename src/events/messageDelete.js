// Cache: channelId -> { content, author, authorId, authorAvatar, timestamp, attachmentUrl }
if (!global._snipeCache) global._snipeCache = new Map();
const snipeCache = global._snipeCache;

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    // Ignore bots and partial messages with no useful data
    if (message.author?.bot) return;
    if (!message.guild) return;

    // Only cache if there's actual content or an attachment
    const content = message.content || null;
    const attachment = message.attachments?.first()?.url || null;

    if (!content && !attachment) return;

    snipeCache.set(message.channel.id, {
      content,
      attachment,
      author: message.author?.tag || 'Unknown User',
      authorId: message.author?.id || null,
      authorAvatar: message.author?.displayAvatarURL({ extension: 'png', size: 64 }) || null,
      timestamp: message.createdTimestamp || Date.now(),
      deletedAt: Date.now(),
    });
  },
};
