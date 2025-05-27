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

    // Store uploaded files from Google Drive
    googleDriveFiles: [
      {
        fileId: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          default: 0,
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
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          default: null,
        },
      },
    ],
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
