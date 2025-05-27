const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const CourseSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "UserId required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Please enter course name"],
      trim: true,
    },

    code: {
      type: String,
      required: [true, "Please enter course code"],
      trim: true,
      uppercase: true,
    },

    courseInstanceId: {
      type: String,
      required: [true, "Course instance ID required"],
      unique: true,
      default: uuidv4,
    },

    hasSyllabus: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    icon: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

// Add compound index for userId and code to prevent duplicates per user
CourseSchema.index({ userId: 1, code: 1 }, { unique: true });

// Handle duplicate key errors gracefully
CourseSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(new Error("A course with this code already exists for this user"));
  } else {
    next(error);
  }
});

// Check if model already exists to prevent OverwriteModelError
const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);

module.exports = Course;
