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
    category: {
      type: String,
      enum: ["task", "assignment", "exam", "final", "project", "quiz", "other"],
      default: "task",
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
  if (hoursDiff <= 3) return "urgent"; // 3 hours or less
  if (hoursDiff <= 24) return "dueSoon"; // within 24 hours
  return "normal"; // more than 24 hours
});

// Virtual to check if it's an important item due within a week
todoSchema.virtual("isImportantSoon").get(function() {
  if (!this.dueDate || this.completed) return false;
  
  const importantCategories = ["exam", "final", "project"];
  if (!importantCategories.includes(this.category)) return false;
  
  const now = new Date();
  const timeDiff = this.dueDate - now;
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  
  return daysDiff > 0 && daysDiff <= 7; // Due within a week
});

// Set completedAt when marking as complete and ensure category
todoSchema.pre("save", function(next) {
  // Ensure category has a value
  if (!this.category) {
    this.category = "task";
  }
  
  // Handle completedAt
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

// Static method to clean up old completed tasks
todoSchema.statics.cleanupOldCompleted = async function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    completed: true,
    completedAt: { $lt: twentyFourHoursAgo }
  });
  
  return result.deletedCount;
};

module.exports = mongoose.model("Todo", todoSchema);