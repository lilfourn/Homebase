const mongoose = require("mongoose");

const SyllabusSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "User ID required"],
      index: true,
    },

    courseId: {
      type: String,
      required: [true, "Course ID required"],
      index: true,
    },

    courseInstanceId: {
      type: String,
      required: [true, "Course instance ID required"],
      index: true,
    },

    // Google Drive file information
    fileId: {
      type: String,
      required: [true, "File ID required"],
      unique: true,
    },

    fileName: {
      type: String,
      required: [true, "File name required"],
      trim: true,
    },

    mimeType: {
      type: String,
      required: [true, "MIME type required"],
    },

    size: {
      type: Number,
      default: 0,
    },

    webViewLink: {
      type: String,
      required: false,
    },

    downloadUrl: {
      type: String,
      required: false,
    },

    // Extracted content for AI processing (future use)
    extractedContent: {
      type: String,
      required: false,
      default: "",
    },

    // Parsed syllabus data (future use for AI extraction)
    parsedData: {
      gradingBreakdown: {
        type: Map,
        of: Number,
        required: false,
      },
      assignmentDates: [
        {
          title: String,
          dueDate: Date,
          description: String,
        },
      ],
      examDates: [
        {
          title: String,
          date: Date,
          description: String,
        },
      ],
      contacts: [
        {
          name: String,
          role: String,
          email: String,
          phone: String,
        },
      ],
    },

    // Processing status
    isProcessed: {
      type: Boolean,
      default: false,
    },

    processingError: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "syllabi",
  }
);

// Add compound index to ensure one syllabus per course per user
SyllabusSchema.index({ userId: 1, courseInstanceId: 1 }, { unique: true });

// Check if model already exists to prevent OverwriteModelError
const Syllabus =
  mongoose.models.Syllabus || mongoose.model("Syllabus", SyllabusSchema);

module.exports = Syllabus;
