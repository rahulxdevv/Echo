const mongoose = require('mongoose');
const { Schema } = mongoose;

const inviteSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    index: true
  },
  inviterId: {
    type: String,
    required: true,
    index: true
  },
  inviterTag: {
    type: String,
    required: true
  },
  invitedUserId: {
    type: String,
    required: true
  },
  invitedUserTag: {
    type: String,
    required: true
  },
  inviteCode: {
    type: String,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  left: {
    type: Boolean,
    default: false
  },
  leftAt: {
    type: Date,
    default: null
  },
  fake: {
    type: Boolean,
    default: false
  }
});

inviteSchema.index({ guildId: 1, inviterId: 1 });
inviteSchema.index({ guildId: 1, invitedUserId: 1 });

module.exports = mongoose.model('Invite', inviteSchema);
