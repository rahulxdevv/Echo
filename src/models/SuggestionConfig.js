const mongoose = require('mongoose');

const suggestionConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  enabled: { type: Boolean, default: false },
});

module.exports = mongoose.model('SuggestionConfig', suggestionConfigSchema);
