function isFreeAccessPeriod() {
  const now = new Date();
  const start = new Date(process.env.IDF_FREE_ACCESS_START);
  const end = new Date(process.env.IDF_FREE_ACCESS_END);
  return now >= start && now <= end;
}

function freeAccessMiddleware(req, res, next) {
  if (isFreeAccessPeriod()) {
    return next();
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Login required to access this feature.' });
  }
  next();
}

module.exports = freeAccessMiddleware;
