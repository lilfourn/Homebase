const Course = require("../models/course.model")
const { getAuth } = require('@clerk/express')

const addCourse = async (req, res) => {
    try {
      // 1) extract Clerk userId
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Not signed in" });
  
      // 2) build the new course payload
      const payload = {
        ...req.body,      // name, code, description, icon
        userId            // attach creator
      };
  
      // 3) save
      const course = await Course.create(payload);
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: error.message });
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

module.exports = {
    addCourse,
    viewCourses,
    getCoursesByUser
}