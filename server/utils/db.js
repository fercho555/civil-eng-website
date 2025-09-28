const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  await client.connect();
  const db = client.db('contactDB'); // your database name

  cachedClient = client;
  cachedDb = db;
  console.log('✅ Connected to MongoDB Atlas');

  return { client, db };
}

module.exports = connectToDatabase;
