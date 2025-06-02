const { requireAuth } = require('@clerk/express');

// Extract user ID from Clerk auth
const extractUserId = (req, res, next) => {
  if (req.auth && req.auth.userId) {
    req.userId = req.auth.userId;
  }
  next();
};

module.exports = {
  requireAuth,
  extractUserId
};