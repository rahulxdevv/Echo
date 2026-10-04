const mongoose = require('mongoose');

const stickyMessageSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  message: { type: String, required: true },
  lastMessageId: { type: String, default: null },
  enabled: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

stickyMessageSchema.index({ guildId: 1 });

module.exports = mongoose.model('StickyMessage', stickyMessageSchema);
