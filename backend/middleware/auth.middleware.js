const { requireAuth } = require("@clerk/express");

// Extract user ID from Clerk auth
const extractUserId = (req, res, next) => {
  const authContext = req.auth();
  if (authContext && authContext.userId) {
    req.userId = authContext.userId;
  }
  next();
};

module.exports = {
  requireAuth,
  extractUserId,
};
