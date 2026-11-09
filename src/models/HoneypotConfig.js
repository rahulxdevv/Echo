const mongoose = require('mongoose');

const honeypotConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  logChannelId: { type: String, default: null },
  enabled: { type: Boolean, default: false },
  action: { type: String, enum: ['softban', 'ban', 'kick', 'disabled'], default: 'softban' },
  noDM: { type: Boolean, default: false },
  noWarning: { type: Boolean, default: false },
  forwardMessage: { type: Boolean, default: false },
  reinvite: { type: Boolean, default: false },
  moderationCount: { type: Number, default: 0 },
  warningMessage: { type: String, default: null },
  dmMessage: { type: String, default: null },
  logMessage: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('HoneypotConfig', honeypotConfigSchema);
