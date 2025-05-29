const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const todoSchema = new mongoose.Schema(
  {
    todoId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    courseInstanceId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: [{
      type: String,
      trim: true,
    }],
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
todoSchema.index({ userId: 1, courseInstanceId: 1 });
todoSchema.index({ userId: 1, courseInstanceId: 1, completed: 1 });
todoSchema.index({ userId: 1, courseInstanceId: 1, dueDate: 1 });

// Virtual for urgency calculation
todoSchema.virtual("urgency").get(function() {
  if (!this.dueDate || this.completed) return null;
  
  const now = new Date();
  const timeDiff = this.dueDate - now;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff < 0) return "overdue";
  if (hoursDiff <= 24) return "urgent"; // red
  if (hoursDiff <= 48) return "soon"; // yellow
  return "normal"; // green
});

// Set completedAt when marking as complete
todoSchema.pre("save", function(next) {
  if (this.isModified("completed")) {
    if (this.completed && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.completed) {
      this.completedAt = null;
    }
  }
  next();
});

// Include virtuals in JSON
todoSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Todo", todoSchema);