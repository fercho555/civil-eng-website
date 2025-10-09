const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const authenticateJWT = require('../middlewares/authenticate');

// Add import for User model
const User = require('../models/user');  // <-- Added this line

const RefreshToken = require('../models/refreshToken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secure_jwt_secret_here';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_token_secret';

// Remove in-memory refreshTokens array (already removed in your code)

router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      password_hash: hashedPassword,
      role: 'user'
    };

    const insertResult = await db.collection('users').insertOne(newUser);
    console.log(`New user created with id: ${insertResult.insertedId}`);

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const payload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    const jwtRefreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    const newRefreshToken = new RefreshToken({
      user: user._id,
      token: jwtRefreshToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: Date.now(),
      revokedAt: null,
      replacedByToken: null,
      createdByIp: req.ip
    });
    try {
      await newRefreshToken.save();
      console.log('Refresh token saved:', newRefreshToken.token);
    } catch (saveError) {
      console.error('Failed to save refresh token:', saveError);
      return res.status(500).json({ error: 'Failed to save refresh token' });
    }

    res.status(200).json({
      message: "Login successful.",
      accessToken: accessToken,
      refreshToken: jwtRefreshToken
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    const ipAddress = req.ip;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    // Use populated User model here after import fix
    const refreshTokenDoc = await RefreshToken.findOne({ token }).populate('user');

    if (!refreshTokenDoc || !refreshTokenDoc.isActive) {
      return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }

    refreshTokenDoc.revokedAt = Date.now();
    refreshTokenDoc.revokedByIp = ipAddress;

    const newRefreshTokenString = jwt.sign(
      {
        userId: refreshTokenDoc.user._id.toString(),
        username: refreshTokenDoc.user.username,
        role: refreshTokenDoc.user.role
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    refreshTokenDoc.replacedByToken = newRefreshTokenString;
    await refreshTokenDoc.save();

    const newRefreshTokenDoc = new RefreshToken({
      user: refreshTokenDoc.user._id,
      token: newRefreshTokenString,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: Date.now(),
      createdByIp: ipAddress,
    });
    await newRefreshTokenDoc.save();

    const newAccessToken = jwt.sign(
      {
        userId: refreshTokenDoc.user._id.toString(),
        username: refreshTokenDoc.user.username,
        role: refreshTokenDoc.user.role
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshTokenString });

  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token is required for logout.' });
    }

    const refreshTokenDoc = await RefreshToken.findOne({ token });

    if (!refreshTokenDoc || !refreshTokenDoc.isActive) {
      return res.status(400).json({ message: 'Refresh token is already revoked or invalid.' });
    }

    refreshTokenDoc.revokedAt = Date.now();
    refreshTokenDoc.revokedByIp = req.ip;

    await refreshTokenDoc.save();

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    const db = req.db;
    const usersCollection = db.collection('users');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    // Explicitly project the password_hash field
    const user = await usersCollection.findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { projection: { password_hash: 1, username: 1, role: 1 } }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if password_hash exists before comparing
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Password hash missing from user data.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password_hash: hashedNewPassword } }
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;

