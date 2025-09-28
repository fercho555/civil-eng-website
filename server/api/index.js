require('dotenv').config();

const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
const authRoute = require('../routes/auth');
const connectToDatabase = require('../utils/db');

const contactRoute = require('./routes/contact');
const enrichRoute = require('./routes/enrich');
const projectRoute = require('./routes/project');
const reportRoute = require('./routes/report');
const idfRoute = require('./routes/idf');

const app = express();
// Add logging middleware right after creating the app 
app.use((req, res, next) => {
  console.log('Request:', req.method, req.url, 'Origin:',req.headers.origin);
  next();
});
// CORS configuration to allow requests from deployed frontend URL
const allowedOrigins = [
  'https://civil-eng-website.vercel.app',
  'https://civil-eng-website-g7q2.vercel.app',
  'https://civil-eng-website-g7q2-93x1o7qrr-fercho555s-projects.vercel.app',
  'https://civil-eng-website-g7q2-git-main-fercho555s-projects.vercel.app',
  'http://localhost:3000' // for local development if needed
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    //if (!origin) return callback(null, true); // allow curl/postman without origin
    const allowedPattern = /^https:\/\/civil-eng-website-g7q2(-[a-z0-9]+)?-fercho555s-projects\.vercel\.app$|^https:\/\/civil-eng-website\.vercel\.app$|^http:\/\/localhost:3000$/;
    //if (allowedOrigins.includes(origin)) callback(null, true);
    //else callback(new Error('Not allowed by CORS'));
    if (!origin || allowedPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// 1. Use CORS middleware with options before routes and before body parsing
app.use(cors(corsOptions));

// 2. Parse JSON
app.use(express.json());
// 3. Handle OPTIONS preflight requests for all routes
app.options('/*splat', cors(corsOptions)); //Explicitly handle OPTIONS
// 4. Attach MongoDB per-request
app.use(async (req, res, next) => {
  try {
    const { db } = await connectToDatabase();
    req.db = db;
    next();
  } catch (error) {
    next(error);
  }
});
// 5. Mount your API routes
app.use('/auth', authRoute);

// === 1. MongoDB Setup ===
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  tls: true,                  // Ensure TLS for Render
  serverSelectionTimeoutMS: 5000,  // Faster fail on bad connection
});

async function startServer() {
  try {
    await client.connect();
    const db = client.db('contactDB');
    app.locals.db = db;
    console.log('✅ Connected to MongoDB Atlas');

    // Middleware to attach DB to every request
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // === 2. API Routes ===
    app.use('/api/idf', idfRoute);
    app.use('/api/contact', contactRoute);
    app.use('/api/enrich-location', enrichRoute);
    app.use('/api/project', projectRoute);
    app.use('/api/report', reportRoute);

    // === 3. Serve React Frontend (Production) ===
    app.use(express.static(path.join(__dirname, 'client/build')));

    // Catch-all route for React (Express 4 compatible)
    app.get('/*', (req, res) => {
      res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });

    // === 4. Start Server ===
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB or start server:', err);
    process.exit(1); // Exit if DB or server fails
  }
}

module.exports = serverless(app);
