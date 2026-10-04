const mongoose = require('mongoose');
const { Schema } = mongoose;

const guildSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  prefix: {
    type: String,
    default: '!'
  },
  joinDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Guild', guildSchema);

