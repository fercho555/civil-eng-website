
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
console.log('Loaded MONGO_URI:', process.env.MONGO_URI);


// ===== Mongoose Connection (NEW ADDITION) =====
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civil-eng-db';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Mongoose MongoDB connection established successfully."))
  .catch((err) => {
    console.error("Mongoose connection error:", err);
    process.exit(1);
  });
// ==============================================


const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(crypto.scrypt);

async function verifyBcrypt(password, hash) {
  return await bcrypt.compare(password, hash);
}

async function verifyScrypt(password, hash) {
  const [saltHex, keyHex] = hash.split(':');
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');

  const derivedKey = await scryptAsync(password, salt, key.length);
  return crypto.timingSafeEqual(derivedKey, key);
}

const RefreshToken = require('../server/models/refreshToken'); // Add import here

const authRoute = require('../server/routes/auth');
const contactRoute = require('../server/routes/contact');
const enrichRoute = require('../archive-node-backend/routes/enrich');
const projectRoute = require('../archive-node-backend/routes/project');
const reportRoute = require('../archive-node-backend/routes/report');
const idfRoute = require('../archive-node-backend/routes/idf');
const connectToDatabase = require('../db');

const authenticateJWT = require('../server/middlewares/authenticate');
const authorizeRoles = require('../server/middlewares/authorizeRoles');
const userRoute = require('../server/routes/user');
const app = express();
// === New detailed CORS and OPTIONS logging middleware (insert here) ===
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`OPTIONS preflight request for ${req.url} from origin: ${req.headers.origin}`);
  }

  // Patch res.setHeader to log CORS related headers being set
  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase().startsWith('access-control-allow')) {
      console.log(`Setting header: ${name} = ${value}`);
    }
    return originalSetHeader.call(this, name, value);
  };

  res.on('finish', () => {
    const acao = res.getHeader('Access-Control-Allow-Origin');
    if (acao) {
      console.log(`Response to ${req.method} ${req.url} included Access-Control-Allow-Origin: ${acao}`);
    }
  });

  next();
});
// ===1. Diagnostic middleware to log requests & responses
app.use((req, res, next) => {
  console.log(`Received request: method=${req.method} url=${req.url}`);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));

  // Patch res.send/res.status to detect if response already sent early
  const originalSend = res.send;
  res.send = function(...args) {
    console.log(`Sending response early with statusCode=${res.statusCode} for ${req.method} ${req.url}`);
    return originalSend.apply(this, args);
  };

  res.on('finish', () => {
    console.log(`Response sent: status=${res.statusCode}`);
    console.log('Response headers:', JSON.stringify(res.getHeaders(), null, 2));
  });
  next();
});
// === 2. Allowed origins including dynamic Vercel URL ===
const allowedOrigins = [
  'https://civil-eng-website-1ugh.vercel.app',
  'https://civispec.com',
  'https://www.civispec.com',
  `https://${process.env.VERCEL_URL}`, // Dynamic current deployment URL
  'http://localhost:3000'
];
// === 3. CORS options and global middleware ===
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin like curl or mobile apps
      return callback(null, true);
    }

    // Match exact whitelist or any *.vercel.app subdomain dynamically
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
// Global CORS middleware for all routes
app.use(cors(corsOptions));

// === Handling all OPTIONS preflight requests for any route ===
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    console.log(`Preflight OPTIONS ${req.url} from origin: ${origin}`);

    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      return res.status(403).end();
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(204).end(); // No content, no body
  }
  next();
});

// Parse JSON bodies on all requests
app.use(express.json());

// === 4. Explicit OPTIONS preflight handler, always reply with 200 & CORS headers ===
app.options('/:splat(*)', (req, res) => {
  console.log(`Preflight OPTIONS request received on ${req.url} from origin: ${req.headers.origin}`);
  const origin = req.headers.origin;
  console.log('Origin header:', origin);

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log('Setting Access-Control-Allow-Origin header:', origin);
  } else {
    console.log('Origin not allowed:', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Explicitly send small json 200
  res.status(200).json({});
});


// === 5. Your existing routes below ===
app.get('/api/test', (req, res) => {
  console.log('API test endpoint hit');
  res.json({ message: 'API test endpoint working' });
});
// Attach a MongoDB connection to each request
app.use(async (req, res, next) => {
  try {
    const db  = await connectToDatabase();
    req.db = db;
    next();
  } catch (error) {
    next(error);
  }
});

// Signup POST route - assign default role 'user'
app.post('/auth/signup', async (req, res) => {
  try {
    const db = req.db;
    const usersCollection = db.collection('users');
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      password: hashedPassword,
      role: 'user',
      trial_start: new Date(),
      trial_duration_days: 7,
      emailVerified: false
    };

    await usersCollection.insertOne(newUser);

    res.status(201).json({ message: 'User created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Updated login route with guard for JWT secrets and refresh token saving
app.post('/auth/login', async (req, res) => {
  const jwtSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

if (!jwtSecret || !refreshSecret) {
  console.error("Missing JWT_SECRET or REFRESH_TOKEN_SECRET in environment variables");
  return res.status(500).json({
    error: "Server misconfiguration: JWT_SECRET or REFRESH_TOKEN_SECRET is missing."
  });
}

try {
  const db = req.db;
  const usersCollection = db.collection('users');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  // IMPORTANT: Change 'password' field to 'password_hash' here:
  const user = await usersCollection.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
// Compare plain text to hash
  let isMatch = false;
// const isMatch = await bcrypt.compare(password, user.password_hash);
if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) {
      isMatch = await verifyBcrypt(password, user.password_hash);
    } else {
      // Assume scrypt format "salt:key"
      isMatch = await verifyScrypt(password, user.password_hash);
    }
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
// Upgrade scrypt hashes to bcrypt on successful login
  if (!(user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$'))) {
    const newHash = await bcrypt.hash(password, 10);
    await usersCollection.updateOne({ _id: user._id }, { $set: { password_hash: newHash } });
    console.log(`Upgraded password hash to bcrypt for user ${username}`);
  }
  const payload = {
    userId: user._id,
    username: user.username,
    role: user.role,
  };
// Generate JWT or session
   
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
  const refreshTokenString = jwt.sign(payload, refreshSecret, { expiresIn: '7d' });

    // Create refresh token document and save to MongoDB
    const newRefreshToken = new RefreshToken({
      user: user._id,
      token: refreshTokenString,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: Date.now(),
      revokedAt: null,
      replacedByToken: null,
      createdByIp: req.ip,
    });

    try {
      await newRefreshToken.save();
      console.log('Refresh token saved:', refreshTokenString);
    } catch (saveErr) {
      console.error('Failed to save refresh token:', saveErr);
      return res.status(500).json({ error: 'Failed to save refresh token' });
    }

    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      refreshToken: refreshTokenString,
      user: payload,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }

});
// Protected IDF curve route with trial check
app.get('/api/idf/curve', authenticateJWT, async (req, res) => {
  const db = req.db;
  const usersCollection = db.collection('users');

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const now = new Date();
    const trialEnd = new Date(user.trial_start);
    trialEnd.setDate(trialEnd.getDate() + user.trial_duration_days);

    if (now > trialEnd) {
      return res.status(403).json({ error: 'Trial expired. Please upgrade.' });
    }

    res.json({ message: 'Here is your IDF curve data...' });
  } catch (err) {
    console.error('IDF route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example admin-only route protected by RBAC
app.get('/api/admin/dashboard', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome to the admin dashboard!' });
});

// Register API route handlers
app.use('/api/auth', authRoute);
app.use('/api/contact', contactRoute);
app.use('/api/user', userRoute);
app.use('/api/enrich-location', enrichRoute);
app.use('/api/project', projectRoute);
app.use('/api/report', reportRoute);
app.use('/api/idf', idfRoute);

// Serve static built React frontend (production)
app.use(express.static(path.resolve(__dirname, '../client/build')));

// Catch-all route to serve React's index.html for any non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

// Catch all 404 handler - put this last before error handlers
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// CORS and general error handling middleware (must be last)
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS policy does not allow access from this origin.' });
  } else {
    next(err);
  }
});

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.send('Hello World');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});



