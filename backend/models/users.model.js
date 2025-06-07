const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "userId required"],
      unique: true,
      index: true,
    },

    fullName: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email address required"],
      lowercase: true,
      trim: true,
      index: true,
    },

    profileImg: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    school: {
      type: String,
      required: false, // Changed to false to handle existing users
      default: "",
      trim: true,
    },

    schoolLogo: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    schoolColors: {
      primary: {
        type: String,
        trim: true,
        default: "",
      },
      secondary: {
        type: String,
        trim: true,
        default: "",
      },
    },

    customPrimaryColor: {
      type: String,
      trim: true,
      default: "",
    },

    customSecondaryColor: {
      type: String,
      trim: true,
      default: "",
    },

    phoneNumbers: {
      type: [String],
      required: false,
      default: [],
    },

    // Student Information (optional)
    lastName: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    studentId: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    // Google Drive Integration
    googleDrive: {
      connected: {
        type: Boolean,
        default: false,
      },
      email: {
        type: String,
        default: "",
      },
      accessToken: {
        type: String,
        default: "",
        select: false, // Don't include in queries by default for security
      },
      refreshToken: {
        type: String,
        default: "",
        select: false, // Don't include in queries by default for security
      },
      tokenExpiry: {
        type: Date,
        default: null,
      },
      connectedAt: {
        type: Date,
        default: null,
      },
      lastSynced: {
        type: Date,
        default: null,
      },
    },

    // Store uploaded files from Google Drive and local uploads
    googleDriveFiles: [
      {
        fileId: {
          type: String,
          required: function () {
            return this.source === "google_drive";
          },
        },
        fileName: {
          type: String,
          required: true,
          trim: true,
          maxlength: 255,
        },
        mimeType: {
          type: String,
          required: true,
          validate: {
            validator: function (v) {
              // Allowed mime types for security
              const allowedTypes = [
                // Documents
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                // Text
                "text/plain",
                "text/csv",
                "text/markdown",
                // Code
                "text/javascript",
                "application/javascript",
                "text/typescript",
                "text/x-python",
                "text/x-java-source",
                "text/html",
                "text/css",
                "application/json",
                // Images
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/svg+xml",
                // Google Drive folders
                "application/vnd.google-apps.folder",
                "application/vnd.google-apps.document",
                "application/vnd.google-apps.spreadsheet",
                "application/vnd.google-apps.presentation",
              ];
              return (
                allowedTypes.includes(v) ||
                v.startsWith("text/") ||
                v.startsWith("application/vnd.google-apps.")
              );
            },
            message: "File type not allowed for security reasons",
          },
        },
        size: {
          type: Number,
          default: 0,
          max: 52428800, // 50MB max file size
        },
        source: {
          type: String,
          enum: ["google_drive", "local_upload"],
          default: "google_drive",
          required: true,
        },
        // For local uploads, store processed content
        processedContent: {
          type: String,
          select: false, // Don't include by default due to size
          maxlength: 10485760, // 10MB max content size
        },
        // For local uploads, store SHA-256 hash for integrity
        contentHash: {
          type: String,
          select: false,
        },
        webViewLink: {
          type: String,
          default: "",
        },
        iconLink: {
          type: String,
          default: "",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        googleDriveModifiedAt: {
          type: Date,
          default: null,
        },
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          default: null,
        },
        // Security metadata
        isQuarantined: {
          type: Boolean,
          default: false,
        },
        scanStatus: {
          type: String,
          enum: ["pending", "clean", "infected", "error"],
          default: "pending",
        },
        lastScannedAt: {
          type: Date,
        },
        base64Content: {
          type: String,
        },
      },
    ],

    // Agent Usage Statistics
    agentStats: {
      noteTaker: {
        notesCreated: {
          type: Number,
          default: 0,
        },
        lastUsed: {
          type: Date,
          default: null,
        },
        totalTimesSaved: {
          type: Number,
          default: 0,
        },
      },
      researcher: {
        topicsResearched: {
          type: Number,
          default: 0,
        },
        lastUsed: {
          type: Date,
          default: null,
        },
        papersAnalyzed: {
          type: Number,
          default: 0,
        },
      },
      flashcardMaker: {
        flashcardsCreated: {
          type: Number,
          default: 0,
        },
        lastUsed: {
          type: Date,
          default: null,
        },
        decksCreated: {
          type: Number,
          default: 0,
        },
      },
      homeworkAssistant: {
        problemsSolved: {
          type: Number,
          default: 0,
        },
        lastUsed: {
          type: Date,
          default: null,
        },
        assignmentsCompleted: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Handle duplicate key errors gracefully
UserSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    if (error.message.includes("userId")) {
      next(new Error("User with this ID already exists"));
    } else if (error.message.includes("email")) {
      next(new Error("User with this email already exists"));
    } else {
      next(new Error("Duplicate entry detected"));
    }
  } else {
    next(error);
  }
});

// Check if model already exists to prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = User;
