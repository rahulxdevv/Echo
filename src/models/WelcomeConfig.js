const mongoose = require('mongoose');

const welcomeConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Welcome settings
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },

  // Card customization
  message: { type: String, default: 'Welcome to the server!' },
  backgroundUrl: { type: String, default: './public/wallpaper.png' },

  // Advanced card customization
  avatarSize: { type: Number, default: 180 },
  avatarX: { type: Number, default: null }, // null = centered
  avatarY: { type: Number, default: 45 },

  usernameColor: { type: String, default: '#00f0b5' },
  usernameSize: { type: Number, default: 60 },
  usernameY: { type: Number, default: 257 },

  welcomeTextColor: { type: String, default: '#f2f4f5' },
  welcomeTextSize: { type: Number, default: 48 },
  welcomeTextY: { type: Number, default: 300 },

  messageColor: { type: String, default: 'rgba(235, 238, 241, 0.62)' },
  messageSize: { type: Number, default: 25 },
  messageY: { type: Number, default: 397 },

  backgroundBlur: { type: Number, default: 3 },
  overlayDarkness: { type: Number, default: 0.5 }, // 0-1
  bottomGradientHeight: { type: Number, default: 80 },
  bottomGradientOpacity: { type: Number, default: 0.4 },

  // Text message
  textMessage: { type: String, default: 'Welcome {mention} to **{server}**! You are member #{memberCount}!' },
  mentionUser: { type: Boolean, default: true },

  // Auto role
  autoRoleEnabled: { type: Boolean, default: false },
  autoRoles: [{ type: String }],

  // DM settings
  dmEnabled: { type: Boolean, default: false },
  dmMessage: { type: String, default: 'Welcome to **{server}**! We hope you enjoy your stay.' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WelcomeConfig', welcomeConfigSchema);
