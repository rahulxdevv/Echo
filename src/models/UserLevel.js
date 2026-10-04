const mongoose = require('mongoose');

const userLevelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },

  // XP and Level
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },

  // Statistics
  messageCount: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },

  // Cooldowns
  lastMessageXp: { type: Date, default: null },
  lastVoiceXp: { type: Date, default: null },

  // Voice tracking
  voiceJoinTime: { type: Date, default: null },
  isInVoice: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, totalXp: -1 }); // For leaderboard
userLevelSchema.index({ guildId: 1, level: -1 }); // For level queries

module.exports = mongoose.model('UserLevel', userLevelSchema);
