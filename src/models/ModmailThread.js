const mongoose = require('mongoose');

const modmailThreadSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true }, // The text channel ID in the guild
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

modmailThreadSchema.index({ userId: 1, active: 1 });
modmailThreadSchema.index({ channelId: 1 });

module.exports = mongoose.model('ModmailThread', modmailThreadSchema);
