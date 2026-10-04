const mongoose = require('mongoose');

const levelRewardSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  roleId: { type: String, required: true },
  removeOnLevelUp: { type: Boolean, default: false }
}, { _id: false });

const levelConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // System settings
  enabled: { type: Boolean, default: true },
  announceChannel: { type: String, default: null }, // null = same channel
  announceMessage: { type: String, default: 'Congratulations {mention}! You reached **Level {level}**!' },
  announceDM: { type: Boolean, default: false },

  // XP settings
  messageXpMin: { type: Number, default: 15 },
  messageXpMax: { type: Number, default: 25 },
  messageXpCooldown: { type: Number, default: 60 }, // seconds
  voiceXpPerMinute: { type: Number, default: 10 },
  voiceXpCooldown: { type: Number, default: 60 }, // seconds

  // Multipliers
  xpMultiplier: { type: Number, default: 1 },
  roleMultipliers: [{
    roleId: { type: String, required: true },
    multiplier: { type: Number, required: true }
  }],

  // Channel settings
  ignoredChannels: [{ type: String }],
  ignoredRoles: [{ type: String }],
  xpChannels: [{ type: String }], // empty = all channels

  // Level rewards
  rewards: [levelRewardSchema],

  // Advanced settings
  stackRewards: { type: Boolean, default: true }, // keep previous level rewards
  requireVoiceActivity: { type: Boolean, default: true }, // must not be muted/deafened
  levelFormula: { type: String, default: 'default' }, // default, linear, exponential

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LevelConfig', levelConfigSchema);
