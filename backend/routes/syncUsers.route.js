const express = require("express");
const User = require("../models/users.model");
const {
  viewUsers,
  updateUserSchool,
  getUserByClerkId,
} = require("../controllers/user.controller");
const router = express.Router();

// view all users
router.get("/", viewUsers);

// get user by clerk ID
router.get("/:userId", getUserByClerkId);

// update user school
router.put("/school", updateUserSchool);

module.exports = router;
