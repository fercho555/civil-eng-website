// server/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const router = express.Router();
const secret = process.env.JWT_SECRET || 'your_jwt_secret'; // Replace with strong secret in production

// User registration route (you already have this in index.js,
// but you can move or extend it here for modularity)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    const db = req.app.locals.db;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      username,
      password_hash: hashedPassword,
      role,
      freeAccessStart: null // Optional: track free access start here
    });

    return res.status(201).json({ message: "User registered successfully", userId: result.insertedId });
  } catch (err) {
    console.error('Error in /api/auth/register:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// User login route to get JWT token
router.post('/login', async (req, res) => {
  try {
    console.log('Login route hit, req.body:', req.body);
    const { username, password } = req.body;
    const db = req.app.locals.db;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (!user.password_hash) {
      // Defensive check in case password hash is missing
      return res.status(401).json({ error: "Invalid username or password." });
    }

    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (err) {
      console.error('bcrypt compare error:', err);
      return res.status(500).json({ error: "Internal server error." });
    }

    

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, role: user.role },
      secret,
      { expiresIn: '1h' }
    );

    return res.json({ token, userId: user._id, username: user.username, role: user.role });
  } catch (err) {
    console.error('Error in /api/auth/login:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
