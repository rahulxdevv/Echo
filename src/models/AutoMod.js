const mongoose = require('mongoose');

const autoModSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Anti-spam settings
  antiSpam: {
    enabled: { type: Boolean, default: false },
    maxMessages: { type: Number, default: 5 },
    timeWindow: { type: Number, default: 5000 }, // milliseconds
    muteTime: { type: Number, default: 300000 }, // 5 minutes
  },

  // Anti-link settings
  antiLink: {
    enabled: { type: Boolean, default: false },
    allowedDomains: [{ type: String }],
    action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' },
  },

  // Anti-invite settings
  antiInvite: {
    enabled: { type: Boolean, default: false },
    action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' },
  },

  // Bad words filter
  badWords: {
    enabled: { type: Boolean, default: false },
    words: [{ type: String }],
    action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' },
  },

  // Anti-caps settings
  antiCaps: {
    enabled: { type: Boolean, default: false },
    percentage: { type: Number, default: 70 },
    minLength: { type: Number, default: 10 },
  },

  // Ignored channels and roles
  ignoredChannels: [{ type: String }],
  ignoredRoles: [{ type: String }],

  // Logging
  logChannel: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AutoMod', autoModSchema);
