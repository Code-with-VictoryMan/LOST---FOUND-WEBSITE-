const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_lost_found';
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.error('Ensure MongoDB service is running locally or specify a MongoDB Atlas MONGODB_URI in .env');
    // Don't crash immediately so API can report graceful database connectivity status
  }
};

module.exports = connectDB;
