const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 })
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB Atlas!');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED TO CONNECT:', err.message);
    process.exit(1);
  });
