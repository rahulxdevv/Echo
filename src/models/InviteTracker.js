const mongoose = require('mongoose');
const { Schema } = mongoose;

const inviteTrackerSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invites: {
    type: Map,
    of: {
      code: String,
      inviterId: String,
      uses: Number
    },
    default: new Map()
  },
  enabled: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('InviteTracker', inviteTrackerSchema);
