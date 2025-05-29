const express = require("express");
const User = require("../models/users.model");
const {
  viewUsers,
  updateUserSchool,
  getUserByClerkId,
  syncUser,
  updateUserSchoolAndColors,
  updateUserCustomColors,
  updateUserNameInfo,
  upload,
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

// Update user's school and fetch/store school colors
router.put("/school-colors", updateUserSchoolAndColors);

// Update user's custom theme colors and potentially schoolLogo
// The 'upload.single("schoolLogo")' middleware will process the file named "schoolLogo"
router.put(
  "/custom-colors",
  upload.single("schoolLogo"),
  updateUserCustomColors
);

// Update user's name information (lastName, studentId)
router.put("/name-info", updateUserNameInfo);

module.exports = router;
