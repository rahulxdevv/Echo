const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  tag: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  bank: {
    type: Number,
    default: 0
  },
  inventory: [{
    itemId: String,
    name: String,
    quantity: {
      type: Number,
      default: 1
    }
  }],
  lastWork: {
    type: Date,
    default: null
  },
  lastDaily: {
    type: Date,
    default: null
  },
  dailyStreak: {
    type: Number,
    default: 0
  },
  lastRob: {
    type: Date,
    default: null
  },
  lastCommand: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);

