function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    console.log("authorizeRoles: req.user =", req.user);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    console.log("authorizeRoles: req.user.role =", req.user.role);
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied.' });
    }
    next();
  };
}

module.exports = authorizeRoles;
