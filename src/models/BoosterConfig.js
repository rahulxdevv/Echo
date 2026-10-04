const mongoose = require('mongoose');

const boosterConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  message: { type: String, default: '🎉 Thank you {user} for boosting {server}!' },
  enabled: { type: Boolean, default: false }
});

module.exports = mongoose.model('BoosterConfig', boosterConfigSchema);
