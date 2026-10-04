const mongoose = require('mongoose');

const notifierConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  platform: { type: String, enum: ['youtube', 'twitch'], required: true },
  creatorId: { type: String, required: true }, // YT channel ID or Twitch username
  channelId: { type: String, required: true }, // Discord channel ID
  message: { type: String, default: 'Hey! {creator} just went live/uploaded a video! {link}' },
  lastVideoId: { type: String, default: null } // To prevent duplicate alerts
});

notifierConfigSchema.index({ guildId: 1, platform: 1, creatorId: 1 }, { unique: true });

module.exports = mongoose.model('NotifierConfig', notifierConfigSchema);
