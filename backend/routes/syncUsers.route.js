const express = require("express");
const User = require("../models/users.model");
const {
  viewUsers,
  updateUserSchool,
  getUserByClerkId,
  syncUser,
} = require("../controllers/user.controller");
const router = express.Router();

// view all users
router.get("/", viewUsers);

// get user by clerk ID
router.get("/:userId", getUserByClerkId);

// update user school
router.put("/school", updateUserSchool);

// sync user data from Clerk
router.post("/sync", syncUser);

module.exports = router;
