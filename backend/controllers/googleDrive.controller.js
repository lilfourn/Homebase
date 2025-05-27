const User = require("../models/users.model");
const googleDriveService = require("../services/googleDrive/googleDriveService");
const { getAuth } = require("@clerk/express");

/**
 * Get OAuth URL for Google Drive authorization
 */
const getAuthUrl = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const authUrl = googleDriveService.getAuthUrl(userId);
    res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Handle OAuth callback and save tokens
 */
const handleCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res
        .status(400)
        .json({ message: "Missing code or state parameter" });
    }

    // Exchange code for tokens
    const tokens = await googleDriveService.getTokensFromCode(code);

    // Get user info from Google
    const googleUserInfo = await googleDriveService.getUserInfo(tokens);

    // Calculate token expiry (typically 1 hour from now)
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(
      tokenExpiry.getSeconds() + (tokens.expiry_date / 1000 - Date.now() / 1000)
    );

    // Update user with Google Drive credentials
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          "googleDrive.connected": true,
          "googleDrive.email": googleUserInfo.email,
          "googleDrive.accessToken": tokens.access_token,
          "googleDrive.refreshToken": tokens.refresh_token,
          "googleDrive.tokenExpiry": tokenExpiry,
          "googleDrive.connectedAt": new Date(),
        },
      },
      { new: true }
    ).select("+googleDrive.accessToken +googleDrive.refreshToken");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Redirect to frontend success page
    const frontendUrl =
      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard/settings?google_connected=true`);
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    const frontendUrl =
      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard/settings?google_error=true`);
  }
};

/**
 * Disconnect Google Drive
 */
const disconnect = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          "googleDrive.connected": false,
          "googleDrive.email": "",
          "googleDrive.accessToken": "",
          "googleDrive.refreshToken": "",
          "googleDrive.tokenExpiry": null,
          "googleDrive.connectedAt": null,
        },
        $pull: { googleDriveFiles: {} }, // Remove all stored files
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Google Drive disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting Google Drive:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * List files from Google Drive
 */
const listFiles = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const { pageToken, pageSize = 20 } = req.query;

    const user = await User.findOne({ userId }).select(
      "+googleDrive.accessToken +googleDrive.refreshToken"
    );
    if (!user || !user.googleDrive.connected) {
      return res.status(400).json({ message: "Google Drive not connected" });
    }

    // Check if token needs refresh
    let tokens = {
      access_token: user.googleDrive.accessToken,
      refresh_token: user.googleDrive.refreshToken,
    };

    if (new Date() >= user.googleDrive.tokenExpiry) {
      tokens = await googleDriveService.refreshAccessToken(
        user.googleDrive.refreshToken
      );

      // Update tokens in database
      await User.findOneAndUpdate(
        { userId },
        {
          $set: {
            "googleDrive.accessToken": tokens.access_token,
            "googleDrive.tokenExpiry": new Date(tokens.expiry_date),
          },
        }
      );
    }

    const files = await googleDriveService.listFiles(
      tokens,
      pageToken,
      pageSize
    );
    res.status(200).json(files);
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Import file from Google Drive to database
 */
const importFile = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const { fileId, courseId } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const user = await User.findOne({ userId }).select(
      "+googleDrive.accessToken +googleDrive.refreshToken"
    );
    if (!user || !user.googleDrive.connected) {
      return res.status(400).json({ message: "Google Drive not connected" });
    }

    // Check if file already imported
    const existingFile = user.googleDriveFiles.find((f) => f.fileId === fileId);
    if (existingFile) {
      return res.status(400).json({ message: "File already imported" });
    }

    // Get file metadata
    let tokens = {
      access_token: user.googleDrive.accessToken,
      refresh_token: user.googleDrive.refreshToken,
    };

    const fileData = await googleDriveService.getFile(tokens, fileId);

    // Add file to user's imported files
    const fileEntry = {
      fileId: fileData.id,
      fileName: fileData.name,
      mimeType: fileData.mimeType,
      size: parseInt(fileData.size) || 0,
      webViewLink: fileData.webViewLink || "",
      iconLink: fileData.iconLink || "",
      uploadedAt: new Date(),
      courseId: courseId || null,
    };

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $push: { googleDriveFiles: fileEntry },
        $set: { "googleDrive.lastSynced": new Date() },
      },
      { new: true }
    );

    res.status(200).json({
      message: "File imported successfully",
      file: fileEntry,
    });
  } catch (error) {
    console.error("Error importing file:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Remove imported file from database
 */
const removeFile = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const { fileId } = req.params;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $pull: { googleDriveFiles: { fileId } },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "File removed successfully" });
  } catch (error) {
    console.error("Error removing file:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get imported files for user
 */
const getImportedFiles = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const { courseId } = req.query;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let files = user.googleDriveFiles || [];

    // Filter by courseId if provided
    if (courseId) {
      files = files.filter((f) => f.courseId?.toString() === courseId);
    }

    res.status(200).json({ files, totalCount: files.length });
  } catch (error) {
    console.error("Error getting imported files:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  disconnect,
  listFiles,
  importFile,
  removeFile,
  getImportedFiles,
};
