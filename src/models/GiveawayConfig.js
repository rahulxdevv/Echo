const mongoose = require('mongoose');

const giveawayConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  banner: { type: String, default: null },
  thumbnail: { type: String, default: null },
  color: { type: Number, default: null },
  title: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GiveawayConfig', giveawayConfigSchema);
