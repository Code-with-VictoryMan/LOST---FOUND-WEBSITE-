const mongoose = require('mongoose');

// Dedicated cloud MongoDB Atlas connection URI for deployed production instances (e.g. Render)
const DEFAULT_ATLAS_URI = 'mongodb+srv://sravansai102_db_user:hho81eIoscspGpMn@cluster0.lu8a6nq.mongodb.net/campus_lost_found?retryWrites=true&w=majority';

const connectDB = async () => {
  const localUri = 'mongodb://127.0.0.1:27017/campus_lost_found';
  const atlasUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || DEFAULT_ATLAS_URI;

  // On cloud deployment platforms (Render, Railway, Heroku) or when running in production,
  // there is no local 127.0.0.1 MongoDB daemon, so we prioritize the MongoDB Atlas Cloud Cluster.
  const isCloudEnv = Boolean(process.env.RENDER || process.env.NODE_ENV === 'production');
  const primaryUri = isCloudEnv ? atlasUri : (process.env.MONGODB_URI || localUri);
  const secondaryUri = isCloudEnv ? localUri : atlasUri;

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 6000
    });
    const isAtlas = conn.connection.host.includes('mongodb.net');
    console.log(`[MongoDB Connected]: ${conn.connection.host} (${isAtlas ? 'MongoDB Atlas Cloud Cluster' : 'Local Instance'}, DB: ${conn.connection.name})`);
    return conn;
  } catch (primaryError) {
    console.warn(`[MongoDB Warning]: Primary database connection failed: ${primaryError.message}`);

    // Attempt secondary fallback
    if (secondaryUri && secondaryUri !== primaryUri) {
      try {
        console.log(`[MongoDB Fallback]: Attempting secondary connection (${secondaryUri.includes('mongodb.net') ? 'MongoDB Atlas Cloud' : 'Local MongoDB'})...`);
        const fallbackConn = await mongoose.connect(secondaryUri, {
          serverSelectionTimeoutMS: 6000
        });
        const isFallbackAtlas = fallbackConn.connection.host.includes('mongodb.net');
        console.log(`[MongoDB Connected]: Fallback active at ${fallbackConn.connection.host} (${isFallbackAtlas ? 'MongoDB Atlas Cloud Cluster' : 'Local Instance'}, DB: ${fallbackConn.connection.name})`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error(`[MongoDB Fallback Error]: ${fallbackError.message}`);
      }
    }

    console.error('MongoDB is unavailable. Operating with in-memory resilient fallback.');
  }
};

module.exports = connectDB;
