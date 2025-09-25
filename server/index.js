// === Process-Level Error Handlers: Place at the top ===
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err?.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason?.stack || reason);
  process.exit(1);
});

// === Rest of your code begins here ===

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../client/.env') });

console.log('GEOCODER_UA present?', !!process.env.GEOCODER_UA);
console.log('GEOCODER_REF present?', !!process.env.GEOCODER_REF);
console.log('Current directory:', __dirname);
console.log('CWD:', process.cwd());

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const app = express();
const authRoute = require('./routes/auth');

const fs = require('fs');
console.log('Does middleware file exist?', fs.existsSync(path.join(__dirname, 'middlewares', 'freeAccessMiddleware.js')));
const freeAccessMiddleware = require(path.join(__dirname, 'middlewares', 'freeAccessMiddleware.js'));

// --- Basics & Security ---
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '2mb' }));       // avoid giant payloads
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/idf', freeAccessMiddleware);
app.use('/api/auth', authRoute);
// --- CORS ---
// --- Add near the top, after requiring cors ---
const allowedOrigins = [
  'http://localhost:3000',               // React dev server URL
  'https://civil-eng-website.vercel.app'  // Replace with your deployed frontend URL
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, non-browser clients)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS error: origin ${origin} is not allowed by CORS`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));
// --- Routes ---
const contactRoute = require('../routes/contact');
const reportRoute = require('../routes/report');
const projectRoute = require('../routes/project');
const enrichRoute = require('../routes/enrich');
const idfRoute = require('../routes/idf');

app.use('/api/contact', contactRoute);
app.use('/api/report', reportRoute);
app.use('/api/project', projectRoute);
app.use('/api/enrich-location', enrichRoute);
app.use('/api/idf', freeAccessMiddleware, idfRoute);

// --- Simple root + health/version ---
app.get('/', (_req, res) => res.send('Hello, world!'));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/version', (_req, res) => res.json({ version: process.env.APP_VERSION || '0.1.0' }));

// === MongoDB Setup ===
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

// Use your working tested MongoClient options here!
const client = new MongoClient(uri, {
  tls: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  connectTimeoutMS: 10000,
});

let server; // to close gracefully

async function startServer() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const dbName = process.env.MONGO_DB_NAME || 'contactDB';
    const db = client.db(dbName);

    // Save db for routes
    app.locals.db = db;
        // Safety middleware: Attach db to req or throw error if missing
    app.use((req, _res, next) => {
      if (!app.locals.db) {
        return next(new Error('Database not connected'));
      }
      req.db = app.locals.db;
      next();
    });

    // Log incoming requests - optional
    app.use((req, res, next) => {
      console.log(`Incoming request: ${req.method} ${req.url}`);
      next();
    });

    // Example user collection for auth routes
    const usersCollection = db.collection('users');

    app.post('/api/auth/register-test', (req, res) => {
      res.json({ message: 'Test route working' });
    });

    app.post('/api/auth/register', async (req, res) => {
      try {
      const { username, password, role = 'user' } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
      }
      // Use MongoDB collection from req.db (attached by safety middleware)
      const usersCollection = req.db.collection('users');
      
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
          return res.status(409).json({ error: "Username already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await usersCollection.insertOne({ username, password_hash: hashedPassword, role });

        return res.status(201).json({ message: "User registered successfully", userId: result.insertedId });
      } catch (err) {
        console.error('Error in /api/auth/register:', err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });

    // 404 for unknown routes
    app.use((req, res, _next) => {
      res.status(404).json({ error: 'Not Found', path: req.originalUrl });
    });

    // Centralized error handler
    app.use((err, _req, res, _next) => {
    if (!err) {
    console.error('🔥 Unhandled error middleware called without an error object!');
    return res.status(500).json({ error: 'Internal Server Error (No error object)' });
  }
  console.error('🔥 Unhandled error:', err);
  const status = (err.status && typeof err.status === 'number') ? err.status : 500;
  const message = (err.message && typeof err.message === 'string') ? err.message : 'Internal Server Error';
  res.status(status).json({ error: message });
});
  

    // Log registered routes
 console.log('Registered routes:');
if (app._router && Array.isArray(app._router.stack)) {
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      const methods = middleware.route.methods ? Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ') : 'UNKNOWN';
      const path = middleware.route.path || 'UNKNOWN';
      console.log(`${methods} ${path}`);
    } else if (middleware.name === 'router' && middleware.handle && Array.isArray(middleware.handle.stack)) {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const methods = handler.route.methods ? Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(', ') : 'UNKNOWN';
          const path = handler.route.path || 'UNKNOWN';
          console.log(`${methods} ${path}`);
        }
      });
    }
  });
}

    const PORT = process.env.PORT || 3000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      try {
        console.log(`\n🛑 ${signal} received: closing server...`);
        if (server) await new Promise((resolve) => server.close(resolve));
        await client.close();
        console.log('👋 Server and DB connections closed. Bye!');
        process.exit(0);
      } catch (e) {
        console.error('Error during shutdown:', e);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
  try {
    console.error('Caught error type:', typeof err);
    console.error('Caught error value:', err);
    if (err && err.stack) {
      console.error('❌ Failed to connect to MongoDB or start server:', err.stack);
    } else {
      console.error('❌ Failed to connect to MongoDB or start server:', err);
    }
  } catch (loggingError) {
    // If logging itself throws, print minimal info to avoid infinite loops
    console.error('Error while logging error:', loggingError);
    console.error('Original error:', err);
  }
  process.exit(1);
  }
}

startServer();

// Export for testing if needed
module.exports = app;
