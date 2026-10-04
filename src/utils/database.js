const mongoose = require('mongoose');
const { log } = require('./logger');

const connectDB = async () => {
  try {
    log('Database', 'Attempting to connect...');
    
    // Simulating progress as requested for visual consistency
    log('Database', 'Connecting: [====                   ] 20%');
    await new Promise(resolve => setTimeout(resolve, 500));
    log('Database', 'Connecting: [========          ] 60%');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    log('Database', 'Connecting: [============] 100%');
    log('Database', 'Successfully Connected to MongoDB.');
    return conn;
  } catch (error) {
    log('Error', `Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

