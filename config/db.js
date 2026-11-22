const mongoose = require('mongoose');

const connectDB = async () => {
  const localUri = 'mongodb://127.0.0.1:27017/campus_lost_found';
  const atlasUri = process.env.MONGODB_ATLAS_URI;
  const primaryUri = process.env.MONGODB_URI || localUri;

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 4000
    });
    const isAtlas = conn.connection.host.includes('mongodb.net');
    console.log(`[MongoDB Connected]: ${conn.connection.host} (${isAtlas ? 'MongoDB Atlas Cloud' : 'Local Instance'}, DB: ${conn.connection.name})`);
    return conn;
  } catch (primaryError) {
    console.warn(`[MongoDB Warning]: Primary database connection failed: ${primaryError.message}`);

    // If primary failed and was not Atlas, try Atlas if configured
    if (primaryUri !== atlasUri && atlasUri) {
      try {
        console.log('[MongoDB Fallback]: Connecting to MongoDB Atlas Cloud Cluster...');
        const atlasConn = await mongoose.connect(atlasUri, { serverSelectionTimeoutMS: 6000 });
        console.log(`[MongoDB Connected]: Atlas Cloud active at ${atlasConn.connection.host} (DB: ${atlasConn.connection.name})`);
        return atlasConn;
      } catch (atlasErr) {
        console.warn(`[Atlas Fallback Error]: ${atlasErr.message}`);
      }
    }

    // Try local fallback if not already tried
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
