const jwt = require('jsonwebtoken');

// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_token_secret';
const JWT_SECRET = process.env.JWT_SECRET || 'access_token_secret';
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format. Expected: Bearer <token>' });
  }

  const token = tokenParts[1];
  console.log('Incoming Auth Header:', authHeader);
  console.log('JWT Secret in middleware:', JWT_SECRET);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateJWT;