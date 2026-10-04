const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  hostId: { type: String, required: true },
  hostTag: { type: String, required: true },
  prize: { type: String, required: true },
  winners: { type: Number, required: true, default: 1 },
  endTime: { type: Date, required: true },
  ended: { type: Boolean, default: false },
  participants: [{ type: String }],
  winnerIds: [{ type: String }],
  banner: { type: String, default: null },
  thumbnail: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endTime: 1, ended: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
