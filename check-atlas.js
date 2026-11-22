const mongoose = require('mongoose');
require('dotenv').config();

async function checkAtlasConnection() {
  const atlasUri = process.env.MONGODB_ATLAS_URI;
  if (!atlasUri) {
    console.error('❌ MONGODB_ATLAS_URI is not set in .env file.');
    process.exit(1);
  }

  const maskedUri = atlasUri.replace(/(mongodb\+srv:\/\/[^:]+:)[^@]+(@.+)/, '$1******$2');
  console.log('==================================================');
  console.log('MongoDB Atlas Cloud Connection Diagnostic');
  console.log('==================================================');
  console.log('Cluster Endpoint:', atlasUri.split('@')[1]?.split('/')[0]);
  console.log('Connection URI  :', maskedUri);
  console.log('Target Database :', 'campus_lost_found');
  console.log('Status          : Initiating handshake...');

  const startTime = Date.now();

  try {
    const conn = await mongoose.connect(atlasUri, {
      serverSelectionTimeoutMS: 8000
    });

    const latency = Date.now() - startTime;
    console.log('\n✅ CONNECTION SUCCESSFUL:');
    console.log(`- Connected Shard : ${conn.connection.host}`);
    console.log(`- Connection State: ${conn.connection.readyState === 1 ? '1 (Connected / Ready)' : conn.connection.readyState}`);
    console.log(`- Handshake Latency: ${latency} ms`);

    // Run ping admin command
    const pingRes = await conn.connection.db.admin().ping();
    console.log(`- Cluster Ping    : ${pingRes.ok === 1 ? 'OK (Response: 1)' : JSON.stringify(pingRes)}`);

    // Inspect Collections and Record Counts
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`- Collections (${collections.length}) :`);

    for (const col of collections) {
      const count = await conn.connection.db.collection(col.name).countDocuments();
      console.log(`    • ${col.name.padEnd(12)}: ${count} documents`);
    }

    console.log('\n==================================================');
    console.log('MongoDB Atlas is healthy, authenticated, and ready!');
    console.log('==================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    const latency = Date.now() - startTime;
    console.error('\n❌ ATLAS CONNECTION FAILED:');
    console.error(`- Latency         : ${latency} ms`);
    console.error(`- Error Code      : ${err.code || 'N/A'}`);
    console.error(`- Error Name      : ${err.name}`);
    console.error(`- Message         : ${err.message}`);
    if (err.reason) console.error(`- Reason Details  : ${JSON.stringify(err.reason)}`);
    console.log('\nTroubleshooting suggestions:');
    console.log('1. Verify IP Access List in MongoDB Atlas (Network Access -> Add IP Address 0.0.0.0/0).');
    console.log('2. Check username and password credentials in .env.');
    console.log('3. Ensure outbound port 27017 / DNS SRV lookups are permitted by your network.');
    process.exit(1);
  }
}

checkAtlasConnection();
