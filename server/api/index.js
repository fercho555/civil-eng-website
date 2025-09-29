require('dotenv').config();

const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const authRoute = require('../routes/auth');
const contactRoute = require('./routes/contact');
const enrichRoute = require('./routes/enrich');
const projectRoute = require('./routes/project');
const reportRoute = require('./routes/report');
const idfRoute = require('./routes/idf');
const connectToDatabase = require('../utils/db');

const app = express();

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log('Request:', req.method, req.url, 'Origin:', req.headers.origin);
  next();
});

// Only allow custom domains and local development for CORS
const allowedOrigins = [
  'https://civispec.com',
  'https://www.civispec.com',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no Origin (curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Enable CORS middleware globally
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes (important for some browsers/APIs)
app.options('*', cors(corsOptions));

// Parse JSON bodies on all requests
app.use(express.json());

// Attach a MongoDB connection to each request
app.use(async (req, res, next) => {
  try {
    const { db } = await connectToDatabase();
    req.db = db;
    next();
  } catch (error) {
    next(error);
  }
});

// Register API route handlers
app.use('/auth', authRoute);
app.use('/api/contact', contactRoute);
app.use('/api/enrich-location', enrichRoute);
app.use('/api/project', projectRoute);
app.use('/api/report', reportRoute);
app.use('/api/idf', idfRoute);

// Serve static built React frontend (production)
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch-all route to serve React's index.html for any non-API routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// CORS and general error handling middleware (must be last)
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS policy does not allow access from this origin.' });
  } else {
    next(err);
  }
});

// MongoDB setup (for starting a local/standalone server)
// You may OMIt calling startServer() if using serverless for Vercel
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  tls: true,
  serverSelectionTimeoutMS: 5000,
});

async function startServer() {
  try {
    await client.connect();
    const db = client.db('contactDB');
    app.locals.db = db;
    console.log('✅ Connected to MongoDB Atlas');

    // Middleware to attach db per request is already set above

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB or start server:', err);
    process.exit(1);
  }
}

// Uncomment if running locally, otherwise omit for Vercel serverless
// startServer();

module.exports = serverless(app);
