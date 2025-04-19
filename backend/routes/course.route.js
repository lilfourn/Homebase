const express = require('express')
const Course = require('../models/course.model')
const { addCourse, viewCourses } = require('../controllers/course.controller')
const router = express.Router()

// add course
router.post("/", addCourse)

// view all course in db
router.get("/", viewCourses)


module.exports = router