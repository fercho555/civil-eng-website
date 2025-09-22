const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../client/.env') });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI; // or your full Atlas URI string here

async function testConnection() {
  const client = new MongoClient(uri, { tls: true, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  } finally {
    await client.close();
  }
}

testConnection();
