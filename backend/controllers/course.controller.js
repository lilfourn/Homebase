const Course = require("../models/course.model")

const addCourse = async (req, res) => {
    try {
        const course = await Course.create(req.body)
        res.status(200).json(course)
    } catch(error) {
        res.status(500).json({message: error.message})
    }
}

const viewCourses = async (req, res) => {
    try {
        const courses = await Course.find({})
        const amount = await Course.countDocuments({})
        res.status(200).json(courses)
        console.log({totalItems: amount})

    } catch(error) {
        res.status(500).json({message: error.message})
    }
}

module.exports = {
    addCourse,
    viewCourses
}