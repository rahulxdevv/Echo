const mongoose = require('mongoose');
const { Schema } = mongoose;

const blacklistedChannelSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true
  },
  channelName: {
    type: String,
    required: true
  },
  blacklistedAt: {
    type: Date,
    default: Date.now
  },
  blacklistedBy: {
    type: String,
    required: true
  }
});

blacklistedChannelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('BlacklistedChannel', blacklistedChannelSchema);
