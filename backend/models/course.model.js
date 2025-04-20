const mongoose = require('mongoose')

const CourseSchema = mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, "UserId required"]
        }, 

        name: {
            type: String,
            required: [true, "Please enter course name"]
        },

        code: {
            type: String,
            required: [true, "Please enter course code"]
        },

        description: {
            type: String,
            required: false
        },

        icon: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true,
    }
)

const Course = mongoose.model("Course", CourseSchema)

module.exports = Course