import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('../client/.env') });
import { MongoClient } from 'mongodb';

async function testConnection() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI env variable not defined');
    process.exit(1);
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  } finally {
    await client.close();
  }
}

testConnection();
