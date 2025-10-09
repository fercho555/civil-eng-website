const express = require('express');
const { ObjectId } = require('mongodb');
const authenticateJWT = require('../middlewares/authenticate');

const router = express.Router();

// GET /api/user/profile - returns authenticated user info
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const db = req.db;

    // req.user is populated by authenticateJWT middleware from JWT payload
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password_hash: 0 } } // exclude password_hash field
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;