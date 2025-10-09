require('dotenv').config();  // Load variables from .env

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function updatePassword(username, newPassword) {
  const uri = process.env.MONGO_URI;  // Mongo connection string from env

  if (!uri) {
    console.error("Error: MONGO_URI environment variable not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(); // Use default DB from URI or specify if needed
    const users = db.collection('users');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await users.updateOne(
      { username },
      { $set: { password_hash: hashedPassword } }
    );

    if (result.modifiedCount === 1) {
      console.log(`Password for user '${username}' updated successfully.`);
    } else {
      console.log(`No user found with username '${username}'.`);
    }
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await client.close();
  }
}

// Change these values as needed
updatePassword('testadmin', 'clearStretch').catch(console.error);
