const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  hostId: { type: String, required: true },
  hostTag: { type: String, required: true },
  prize: { type: String, required: true },
  winners: { type: Number, required: true, default: 1 },
  endTime: { type: Date, default: null },
  ended: { type: Boolean, default: false },
  endedAt: { type: Date, default: null },
  paused: { type: Boolean, default: false },
  pausedAt: { type: Date, default: null },
  type: { type: String, enum: ['button', 'drop'], default: 'button' },
  dropEmoji: { type: String, default: null },
  color: { type: Number, default: null },
  title: { type: String, default: null },
  participants: [{ type: String }],
  winnerIds: [{ type: String }],
  banner: { type: String, default: null },
  thumbnail: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endTime: 1, ended: 1 });
giveawaySchema.index({ messageId: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
