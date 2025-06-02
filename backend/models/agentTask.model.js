const mongoose = require("mongoose");

const AgentFileSchema = new mongoose.Schema({
  fileId: { type: String, required: true }, // Corresponds to MongoDB ID of the file in User.googleDriveFiles
  fileName: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, required: true },
});

const AgentTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Clerk User ID
      required: true,
      index: true,
    },
    courseInstanceId: {
      type: String, // UUID for the course instance
      required: true,
      index: true,
    },
    taskName: {
      type: String,
      required: true,
    },
    agentType: {
      type: String,
      required: true,
      enum: ["note-taker", "researcher", "study-buddy", "assignment"],
    },
    status: {
      type: String,
      required: true,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    config: {
      // Storing as Mixed type, similar to v.any() in Convex.
      // Alternatively, define a more specific sub-schema if structure is known and consistent.
      mode: { type: String },
      model: { type: String },
      customSettings: { type: mongoose.Schema.Types.Mixed },
    },
    files: [AgentFileSchema], // Array of selected files for the task
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    result: {
      content: { type: String },
      format: { type: String }, // e.g., "markdown", "json"
      metadata: { type: mongoose.Schema.Types.Mixed }, // For any additional structured result data
    },
    usage: {
      tokensUsed: { type: Number },
      processingTime: { type: Number }, // in milliseconds or seconds
      cost: { type: Number },
    },
    error: {
      type: String,
    },
    workerMessage: {
      // For messages from the worker during processing
      type: String,
    },
    jobId: {
      // To store the Bull job ID for potential tracking/management
      type: String,
      index: true,
    },
    // Timestamps: Mongoose adds createdAt and updatedAt by default with { timestamps: true }
    // completedAt can be set specifically when status becomes 'completed'
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "agentTasks",
  }
);

// Index for common queries
AgentTaskSchema.index({ userId: 1, courseInstanceId: 1 });
AgentTaskSchema.index({ userId: 1, status: 1 });

const AgentTask =
  mongoose.models.AgentTask || mongoose.model("AgentTask", AgentTaskSchema);

module.exports = AgentTask;
