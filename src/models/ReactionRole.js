const mongoose = require('mongoose');

const reactionRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  emoji: { type: String, required: true },
  roleId: { type: String, required: true },
});

reactionRoleSchema.index({ guildId: 1, messageId: 1 });
reactionRoleSchema.index({ guildId: 1, messageId: 1, emoji: 1 }, { unique: true });

module.exports = mongoose.model('ReactionRole', reactionRoleSchema);
