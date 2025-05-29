const Course = require("../models/course.model");
const Syllabus = require("../models/syllabus.model");
const Todo = require("../models/todo.model");
const { getAuth } = require("@clerk/express");

const addCourse = async (req, res) => {
  try {
    // 1) extract Clerk userId
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    // 2) build the new course payload
    const payload = {
      ...req.body, // name, code, description, icon
      userId, // attach creator
    };

    // 3) save with better error handling
    const course = await Course.create(payload);
    res.status(201).json(course);
  } catch (error) {
    console.error("Course creation error:", error);

    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        message: "A course with this code already exists for your account",
      });
    } else if (error.name === "ValidationError") {
      // Schema validation error
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    } else {
      return res.status(500).json({ message: error.message });
    }
  }
};

const viewCourses = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const courses = await Course.find({ userId });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCoursesByUser = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const courses = await Course.find({ userId });
    return res.status(200).json(courses);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteUserCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = getAuth(req);

    if (!userId) return res.status(401).json({ message: "Not signed in" });

    // Find the course by its primary _id
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the authenticated user is the owner of the course
    if (course.userId !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to delete this course" });
    }

    // Get courseInstanceId before deletion
    const courseInstanceId = course.courseInstanceId;

    // Delete all related data in parallel
    await Promise.all([
      // Delete the course itself
      Course.findByIdAndDelete(id),
      // Delete associated syllabus
      Syllabus.deleteOne({ courseInstanceId, userId }),
      // Delete all associated todos
      Todo.deleteMany({ courseInstanceId, userId })
    ]);

    res.status(200).json({ 
      message: "Course and all related data deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCourseByInstanceId = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ message: "Not signed in" });
    }

    if (!courseInstanceId) {
      return res
        .status(400)
        .json({ message: "Course instance ID is required" });
    }

    const course = await Course.findOne({ courseInstanceId, userId });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or user not authorized" });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course by instance ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addCourse,
  viewCourses,
  getCoursesByUser,
  deleteUserCourse,
  getCourseByInstanceId,
};
