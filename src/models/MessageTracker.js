const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageTrackerSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

messageTrackerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageTracker', messageTrackerSchema);
