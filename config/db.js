const mongoose = require('mongoose');

const connectDB = async () => {
  const localUri = 'mongodb://127.0.0.1:27017/campus_lost_found';
  const primaryUri = process.env.MONGODB_URI || localUri;

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}:${conn.connection.port || '27017'} (DB: ${conn.connection.name})`);
    return conn;
  } catch (primaryError) {
    console.warn(`[MongoDB Warning]: Primary database (${primaryUri}) connection failed: ${primaryError.message}`);

    // If primary was not local, try local MongoDB fallback
    if (primaryUri !== localUri) {
      try {
        console.log(`[MongoDB Fallback]: Connecting to local MongoDB server (${localUri})...`);
        const fallbackConn = await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 3000
        });
        console.log(`[MongoDB Connected]: Local instance active at ${fallbackConn.connection.host}:${fallbackConn.connection.port} (DB: ${fallbackConn.connection.name})`);
        return fallbackConn;
      } catch (localError) {
        console.error(`[Local MongoDB Error]: ${localError.message}`);
      }
    }

    console.error('MongoDB is unavailable. Operating with in-memory resilient fallback.');
  }
};

module.exports = connectDB;
