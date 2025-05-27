const express = require("express");
const { requireAuth } = require("@clerk/express");
const Course = require("../models/course.model");
const {
  addCourse,
  viewCourses,
  getCoursesByUser,
  deleteUserCourse,
  getCourseByInstanceId,
} = require("../controllers/course.controller");
const router = express.Router();

// add course for specific user
router.post("/", requireAuth(), addCourse);

// view all course in db
router.get("/", viewCourses);

// list only the signed-in user's courses
router.get("/mine", requireAuth(), getCoursesByUser);

// delete a users course
router.delete("/:id", requireAuth(), deleteUserCourse);

// get a specific course by its instance ID for the signed-in user
router.get("/instance/:courseInstanceId", requireAuth(), getCourseByInstanceId);

module.exports = router;
