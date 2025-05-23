const Course = require("../models/course.model");
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
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ message: "course not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addCourse,
  viewCourses,
  getCoursesByUser,
  deleteUserCourse,
};
