const mongoose = require('mongoose');

const activeChannelSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  ownerId: { type: String, required: true },
  controlMessageId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const join2CreateConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  joinChannelId: { type: String, default: null },
  categoryId: { type: String, default: null },
  channelNameFormat: { type: String, default: "{user}'s VC" },
  defaultUserLimit: { type: Number, default: 0 },
  activeChannels: [activeChannelSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

join2CreateConfigSchema.index({ 'activeChannels.channelId': 1 });

module.exports = mongoose.model('Join2CreateConfig', join2CreateConfigSchema);
