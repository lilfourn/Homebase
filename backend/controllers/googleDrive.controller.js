const User = require("../models/users.model");
const googleDriveService = require("../services/googleDrive/googleDriveService");
const { getAuth } = require("@clerk/express");
const mongoose = require("mongoose");

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
      googleDriveModifiedAt: fileData.modifiedTime
        ? new Date(fileData.modifiedTime)
        : new Date(),
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
    const { courseId } = req.query; // Get courseId from query parameters

    let updatedUser;

    if (courseId) {
      // If courseId is provided, only disassociate from this course by setting courseId to null
      // We also need to ensure the file actually belongs to this user.
      const user = await User.findOne({
        userId,
        "googleDriveFiles.fileId": fileId,
      });
      if (!user) {
        return res
          .status(404)
          .json({ message: "File not found for this user." });
      }

      updatedUser = await User.findOneAndUpdate(
        { userId, "googleDriveFiles.fileId": fileId },
        { $set: { "googleDriveFiles.$.courseId": null } },
        { new: true }
      );
      if (!updatedUser) {
        // This case should ideally not be hit if the previous findOne succeeded, but as a safeguard:
        return res
          .status(404)
          .json({ message: "User or file not found for update." });
      }
      res
        .status(200)
        .json({ message: "File disassociated from course successfully" });
    } else {
      // If no courseId, perform global removal from user's imported files
      updatedUser = await User.findOneAndUpdate(
        { userId },
        { $pull: { googleDriveFiles: { fileId } } },
        { new: true }
      );
      if (!updatedUser) {
        return res
          .status(404)
          .json({ message: "User not found or file already removed." });
      }
      res.status(200).json({ message: "File removed globally successfully" });
    }
  } catch (error) {
    console.error("Error removing/disassociating file:", error);
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

    let { courseId } = req.query;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let files = user.googleDriveFiles || [];

    // Filter by courseId if provided
    if (courseId) {
      console.log('[getImportedFiles] Filtering by courseId:', courseId, 'type:', typeof courseId);
      console.log('[getImportedFiles] Total files before filter:', files.length);
      
      // Log first few files for debugging
      files.slice(0, 3).forEach((f, idx) => {
        console.log(`[getImportedFiles] File ${idx}:`, {
          fileName: f.fileName,
          courseId: f.courseId,
          courseIdType: typeof f.courseId,
          courseIdString: f.courseId?.toString(),
          isNull: f.courseId === null,
          isUndefined: f.courseId === undefined
        });
      });
      
      files = files.filter((f) => {
        // Handle both ObjectId and string comparisons
        const fileIdStr = f.courseId?.toString();
        const matches = fileIdStr === courseId.toString();
        return matches;
      });
      console.log('[getImportedFiles] Files after filter:', files.length);
    }

    res.status(200).json({ files, totalCount: files.length });
  } catch (error) {
    console.error("Error getting imported files:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Google Picker configuration
 */
const getPickerConfig = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const user = await User.findOne({ userId }).select(
      "+googleDrive.accessToken +googleDrive.refreshToken"
    );
    if (!user || !user.googleDrive.connected) {
      return res.status(400).json({ message: "Google Drive not connected" });
    }

    const tokens = {
      access_token: user.googleDrive.accessToken,
      refresh_token: user.googleDrive.refreshToken,
      expiry_date: user.googleDrive.tokenExpiry,
    };

    const pickerConfig = await googleDriveService.getPickerConfig(tokens);

    // Update access token if it was refreshed
    if (pickerConfig.accessToken !== user.googleDrive.accessToken) {
      await User.findOneAndUpdate(
        { userId },
        {
          $set: {
            "googleDrive.accessToken": pickerConfig.accessToken,
            "googleDrive.tokenExpiry": new Date(Date.now() + 3600 * 1000), // 1 hour from now
          },
        }
      );
    }

    res.status(200).json(pickerConfig);
  } catch (error) {
    console.error("Error getting picker config:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Import multiple files from Google Drive to database
 */
const importFiles = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const { files: pickerFiles, courseId } = req.body; // Renamed to pickerFiles to avoid confusion

    if (
      !pickerFiles ||
      !Array.isArray(pickerFiles) ||
      pickerFiles.length === 0
    ) {
      return res.status(400).json({ message: "No files provided" });
    }

    const user = await User.findOne({ userId }).select(
      "+googleDrive.accessToken +googleDrive.refreshToken"
    );
    if (!user || !user.googleDrive.connected) {
      return res.status(400).json({ message: "Google Drive not connected" });
    }

    const filesToAdd = [];
    const filesToUpdate = [];
    let skippedCount = 0;
    let associatedCount = 0;

    for (const pickerFile of pickerFiles) {
      const existingFile = user.googleDriveFiles.find(
        (f) => f.fileId === pickerFile.id
      );

      if (existingFile) {
        // File already exists globally
        if (
          existingFile.courseId &&
          existingFile.courseId.toString() === courseId
        ) {
          skippedCount++; // Already associated with this course
        } else {
          // Exists globally, but not associated with THIS course, or courseId is null
          filesToUpdate.push({
            fileId: pickerFile.id,
            courseId: courseId,
          });
        }
      } else {
        // New file, add it
        console.log(`[importFiles] Adding new file "${pickerFile.name}" with courseId:`, courseId, 'type:', typeof courseId);
        filesToAdd.push({
          fileId: pickerFile.id,
          fileName: pickerFile.name,
          mimeType: pickerFile.mimeType || "application/octet-stream",
          size: parseInt(pickerFile.sizeBytes) || 0,
          webViewLink: pickerFile.url || "",
          iconLink: pickerFile.iconUrl || "",
          uploadedAt: new Date(),
          googleDriveModifiedAt: pickerFile.lastEditedUtc
            ? new Date(pickerFile.lastEditedUtc)
            : new Date(),
          courseId: courseId || null,
        });
      }
    }

    if (filesToAdd.length === 0 && filesToUpdate.length === 0) {
      return res.status(200).json({
        // Changed to 200 as it's not an error, just nothing to do or all skipped
        message:
          "No new files to import or associate. All selected files may already be linked to this course.",
        files: [],
        skipped: skippedCount,
        associated: 0,
      });
    }

    const operations = [];
    if (filesToAdd.length > 0) {
      operations.push({
        updateMany: {
          filter: { userId },
          update: { $push: { googleDriveFiles: { $each: filesToAdd } } },
        },
      });
    }

    if (filesToUpdate.length > 0) {
      for (const fileToUpdate of filesToUpdate) {
        operations.push({
          updateOne: {
            filter: { userId, "googleDriveFiles.fileId": fileToUpdate.fileId },
            update: {
              $set: { "googleDriveFiles.$.courseId": fileToUpdate.courseId },
            },
          },
        });
      }
      associatedCount = filesToUpdate.length;
    }

    if (operations.length > 0) {
      await User.bulkWrite(operations);
      await User.findOneAndUpdate(
        // Update lastSynced separately after bulk ops
        { userId },
        { $set: { "googleDrive.lastSynced": new Date() } }
      );
    }

    res.status(200).json({
      message: `${filesToAdd.length} file(s) newly imported, ${associatedCount} file(s) associated with this course.`,
      files: filesToAdd, // Only return newly added files, or adjust as needed
      skipped: skippedCount,
      associated: associatedCount,
    });
  } catch (error) {
    console.error("Error importing/associating files:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Associate existing globally imported files with a specific courseId
 */
const associateFilesToCourse = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Not signed in" });

    const { fileIds, courseId } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: "No file IDs provided" });
    }
    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const operations = [];
    let associatedCount = 0;
    let alreadyAssociatedCount = 0;
    let notFoundCount = 0;

    for (const fileIdToAssociate of fileIds) {
      const fileInUser = user.googleDriveFiles.find(
        (f) => f.fileId === fileIdToAssociate
      );
      if (fileInUser) {
        if (
          fileInUser.courseId &&
          fileInUser.courseId.toString() === courseId
        ) {
          alreadyAssociatedCount++;
        } else {
          operations.push({
            updateOne: {
              filter: { userId, "googleDriveFiles.fileId": fileIdToAssociate },
              update: { $set: { "googleDriveFiles.$.courseId": courseId } },
            },
          });
          associatedCount++;
        }
      } else {
        notFoundCount++;
      }
    }

    if (operations.length > 0) {
      await User.bulkWrite(operations);
      await User.findOneAndUpdate(
        { userId },
        { $set: { "googleDrive.lastSynced": new Date() } }
      );
    }

    let message = "File association process completed.";
    if (associatedCount > 0)
      message += ` ${associatedCount} file(s) newly associated with this course.`;
    if (alreadyAssociatedCount > 0)
      message += ` ${alreadyAssociatedCount} file(s) were already associated with this course.`;
    if (notFoundCount > 0)
      message += ` ${notFoundCount} file(s) were not found in your imported files.`;

    if (
      operations.length === 0 &&
      associatedCount === 0 &&
      notFoundCount === 0 &&
      alreadyAssociatedCount > 0
    ) {
      message = `${alreadyAssociatedCount} file(s) are already associated with this course. No changes made.`;
    } else if (
      operations.length === 0 &&
      associatedCount === 0 &&
      notFoundCount > 0
    ) {
      message = `Could not associate files: ${notFoundCount} file(s) were not found in your imported files.`;
    }

    res.status(200).json({
      message,
      associated: associatedCount,
      alreadyAssociated: alreadyAssociatedCount,
      notFound: notFoundCount,
    });
  } catch (error) {
    console.error("Error associating files with course:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  disconnect,
  listFiles,
  importFile,
  importFiles,
  removeFile,
  getImportedFiles,
  getPickerConfig,
  associateFilesToCourse,
};
