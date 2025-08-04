require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const contactRoute = require('./routes/contact');
const enrichRoute = require('./routes/enrich');
const projectRoute = require('./routes/project');
const reportRoute = require('./routes/report');
const idfRoute = require('./routes/idf');

const app = express();
app.use(cors());
app.use(express.json());

// API routes first
app.use('/api/idf', idfRoute);

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function startServer() {
  try {
    await client.connect();
    const db = client.db('contactDB');
    app.locals.db = db;
    console.log('✅ Connected to MongoDB Atlas');

    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // Other API routes
    app.use('/api/contact', contactRoute);
    app.use('/api/enrich-location', enrichRoute);
    app.use('/api/project', projectRoute);
    app.use('/api/report', reportRoute);

    // === NEW: Serve React frontend build for deployment ===
    app.use(express.static(path.join(__dirname, 'client/build')));

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
    // ======================================================

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1); // Exit if DB fails
  }
}

startServer();
