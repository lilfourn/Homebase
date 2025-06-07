const { FileProcessor } = require("../services/tools/fileProcessor");
const googleDriveService = require("../services/googleDrive/googleDriveService");
const User = require("../models/users.model");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const { createWorker } = require("tesseract.js");
const Tesseract = require("tesseract.js");

// Create file processor instance
const fileProcessor = new FileProcessor();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for terminal uploads
  },
  fileFilter: (req, file, cb) => {
    // Accept common document formats
    const allowedMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/plain",
      "text/csv",
      "text/markdown",
      "text/html",
      "application/json",
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ];

    if (
      allowedMimes.includes(file.mimetype) ||
      file.mimetype.startsWith("text/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

const fileProcessingController = {
  /**
   * Process a file uploaded directly
   */
  async processUploadedFile(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const processor = new FileProcessor({
        chunkSize: 6000,
        preserveStructure: true,
        cleanWhitespace: true,
        includeMetadata: true,
      });

      // Process the file
      const result = await processor.processFile(req.file.buffer, {
        fileName: req.file.originalname,
      });

      // Prepare response
      const response = {
        success: true,
        fileName: req.file.originalname,
        fileType: result.metadata.fileType,
        fileSize: req.file.size,
        content: result.content,
        chunks: result.chunks || [result.content],
        metadata: result.metadata,
        structure: result.structure,
        wordCount: result.content.split(/\s+/).filter((word) => word.length > 0)
          .length,
        preview:
          result.content.substring(0, 500) +
          (result.content.length > 500 ? "..." : ""),
      };

      res.json(response);
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process file",
      });
    }
  },

  /**
   * Process a file from Google Drive
   */
  async processGoogleDriveFile(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { fileId, fileName } = req.body;

      if (!fileId || !fileName) {
        console.error("Validation Error: File ID and name are required.", {
          fileId,
          fileName,
        });
        return res.status(400).json({
          success: false,
          error: "File ID and name are required",
        });
      }

      // Check if fileId looks like a MongoDB ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(fileId)) {
        console.error(
          "Invalid Google Drive file ID - appears to be MongoDB ObjectId:",
          fileId
        );
        return res.status(400).json({
          success: false,
          error:
            "Invalid file ID. This appears to be a local file ID, not a Google Drive file ID. Please use the terminal file content endpoint for local files.",
        });
      }

      // Get user's Google Drive tokens
      const user = await User.findOne({ userId }).select(
        "+googleDrive.accessToken +googleDrive.refreshToken"
      );

      if (!user || !user.googleDrive.connected) {
        console.error("Auth Error: Google Drive not connected for user.", {
          userId,
        });
        return res.status(400).json({
          success: false,
          error: "Google Drive not connected",
        });
      }

      // Prepare tokens
      let tokens = {
        access_token: user.googleDrive.accessToken,
        refresh_token: user.googleDrive.refreshToken,
        expiry_date: user.googleDrive.tokenExpiry,
      };

      // Refresh token if needed
      if (
        user.googleDrive.tokenExpiry &&
        new Date() >= user.googleDrive.tokenExpiry
      ) {
        try {
          console.log(
            "Attempting to refresh Google Drive token for user:",
            userId
          );
          tokens = await googleDriveService.refreshAccessToken(
            user.googleDrive.refreshToken
          );
          console.log(
            "Google Drive token refreshed successfully for user:",
            userId
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
          console.log("Updated Google Drive tokens in DB for user:", userId);
        } catch (tokenError) {
          console.error(
            "Error refreshing Google Drive token for user:",
            userId,
            tokenError
          );

          // Check for invalid_grant error from Google OAuth
          // The error can be in different places depending on the error type
          const isInvalidGrant =
            tokenError.message?.includes("invalid_grant") ||
            tokenError.response?.data?.error === "invalid_grant" ||
            tokenError.error === "invalid_grant";

          if (isInvalidGrant) {
            // Clear invalid tokens from database
            await User.findOneAndUpdate(
              { userId },
              {
                $set: {
                  "googleDrive.accessToken": "",
                  "googleDrive.refreshToken": "",
                  "googleDrive.tokenExpiry": null,
                  "googleDrive.connectedAt": null,
                },
              }
            );

            return res.status(401).json({
              success: false,
              error:
                "Google Drive authentication has expired or been revoked. Please reconnect your Google Drive account in Settings.",
              errorCode: "GOOGLE_INVALID_GRANT",
            });
          }

          return res.status(500).json({
            success: false,
            error:
              "Failed to refresh Google Drive token. Please try again or reconnect your Google Drive account.",
          });
        }
      }

      // Download file from Google Drive
      let fileStream;
      try {
        console.log(
          `Attempting to download Google Drive file: ${fileId} for user: ${userId}`
        );
        fileStream = await googleDriveService.downloadFile(tokens, fileId);
        console.log(
          `Successfully initiated download for Google Drive file: ${fileId} for user: ${userId}`
        );
      } catch (downloadError) {
        console.error(
          `Error downloading Google Drive file: ${fileId} for user: ${userId}`,
          downloadError
        );
        return res.status(500).json({
          success: false,
          error:
            "Failed to download file from Google Drive: " +
            downloadError.message,
        });
      }

      // Convert stream to buffer
      const streamChunks = []; // Renamed to avoid conflict with result.chunks
      try {
        for await (const chunk of fileStream) {
          streamChunks.push(chunk);
        }
      } catch (streamError) {
        console.error(
          `Error reading stream for Google Drive file: ${fileId} for user: ${userId}`,
          streamError
        );
        return res.status(500).json({
          success: false,
          error:
            "Failed to read file stream from Google Drive: " +
            streamError.message,
        });
      }
      const fileBuffer = Buffer.concat(streamChunks);
      console.log(
        `Successfully converted stream to buffer for Google Drive file: ${fileId}, buffer length: ${fileBuffer.length}`
      );

      // Process the file
      const processor = new FileProcessor({
        chunkSize: 6000,
        preserveStructure: true,
        cleanWhitespace: true,
        includeMetadata: true,
      });

      const result = await processor.processFile(fileBuffer, { fileName });
      console.log(
        `Successfully processed Google Drive file: ${fileName} for user: ${userId}`
      );

      // Prepare response
      const response = {
        success: true,
        fileName,
        fileId,
        fileType: result.metadata.fileType,
        fileSize: fileBuffer.length,
        content: result.content,
        chunks: result.chunks || [result.content],
        metadata: result.metadata,
        structure: result.structure,
        wordCount: result.content.split(/\s+/).filter((word) => word.length > 0)
          .length,
        preview:
          result.content.substring(0, 500) +
          (result.content.length > 500 ? "..." : ""),
      };

      res.json(response);
    } catch (error) {
      console.error(
        `Generic error in processGoogleDriveFile for file: ${req.body?.fileName}, user: ${req.auth()?.userId}`,
        error
      );
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process file",
      });
    }
  },

  /**
   * Process multiple files
   */
  async processMultipleFiles(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { files } = req.body; // Array of { fileId, fileName } for Google Drive files

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files provided",
        });
      }

      // Limit number of files
      if (files.length > 5) {
        return res.status(400).json({
          success: false,
          error: "Maximum 5 files can be processed at once",
        });
      }

      const results = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          // Use the existing processGoogleDriveFile logic
          const mockReq = {
            auth: () => authData,
            body: file,
          };

          const mockRes = {
            json: (data) => {
              if (data.success) {
                results.push(data);
              } else {
                errors.push({ fileName: file.fileName, error: data.error });
              }
            },
            status: () => mockRes,
          };

          await this.processGoogleDriveFile(mockReq, mockRes);
        } catch (error) {
          errors.push({ fileName: file.fileName, error: error.message });
        }
      }

      res.json({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors,
        totalWordCount: results.reduce((sum, r) => sum + r.wordCount, 0),
      });
    } catch (error) {
      console.error("Error processing multiple files:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process files",
      });
    }
  },
};

// Add crypto for hashing
const crypto = require("crypto");

/**
 * Security utilities for file processing
 */
const fileSecurityUtils = {
  /**
   * Check if file is safe based on magic numbers (file signature)
   */
  isFileSafeByMagicNumber(buffer) {
    if (!buffer || buffer.length < 4) return false;

    // Define safe magic numbers for allowed file types
    const safeMagicNumbers = {
      // PDF
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      // Images
      jpeg: [0xff, 0xd8, 0xff],
      png: [0x89, 0x50, 0x4e, 0x47],
      gif: [0x47, 0x49, 0x46, 0x38],
      // Documents
      docx: [0x50, 0x4b, 0x03, 0x04], // ZIP format (docx, xlsx, pptx)
      // Text files don't have magic numbers, validated by content
    };

    // Check each safe magic number
    for (const [type, signature] of Object.entries(safeMagicNumbers)) {
      if (signature.every((byte, index) => buffer[index] === byte)) {
        return true;
      }
    }

    // For text files, check if content is valid UTF-8
    try {
      const text = buffer.toString("utf8", 0, Math.min(buffer.length, 1000));
      // Check for null bytes which indicate binary content
      if (!text.includes("\0")) {
        return true;
      }
    } catch (e) {
      // Not valid UTF-8
    }

    return false;
  },

  /**
   * Sanitize filename to prevent path traversal attacks
   */
  sanitizeFilename(filename) {
    // Remove any path components
    const basename = path.basename(filename);
    // Remove special characters except dots and hyphens
    return basename.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 255);
  },

  /**
   * Calculate SHA-256 hash of content
   */
  calculateHash(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
  },
};

/**
 * Process and store file for terminal use
 */
const processTerminalFile = async (req, res) => {
  try {
    const authData = req.auth();
    const userId = authData?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided",
      });
    }

    const file = req.file;
    console.log(
      `Processing terminal file upload: ${file.originalname} for user: ${userId}`
    );

    // Security validation 1: File size (already handled by multer, but double-check)
    if (file.size > 52428800) {
      // 50MB
      return res.status(400).json({
        success: false,
        error: "File size exceeds 50MB limit",
      });
    }

    // Security validation 2: Check magic numbers
    if (!fileSecurityUtils.isFileSafeByMagicNumber(file.buffer)) {
      console.warn(
        `Potentially unsafe file upload attempt: ${file.originalname} by user: ${userId}`
      );
      return res.status(400).json({
        success: false,
        error: "File type not allowed or file appears to be corrupted",
      });
    }

    // Security validation 3: Sanitize filename
    const sanitizedFilename = fileSecurityUtils.sanitizeFilename(
      file.originalname
    );

    // Get user to check file count
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Limit total files per user
    const MAX_FILES_PER_USER = 100;
    if (
      user.googleDriveFiles &&
      user.googleDriveFiles.length >= MAX_FILES_PER_USER
    ) {
      return res.status(400).json({
        success: false,
        error: `Maximum file limit (${MAX_FILES_PER_USER}) reached. Please remove some files first.`,
      });
    }

    // Process file content based on type
    let processedContent = "";
    const mimeType = file.mimetype;

    try {
      if (mimeType.startsWith("text/") || mimeType === "application/json") {
        // Text files: store as-is
        processedContent = file.buffer.toString("utf8");
      } else if (mimeType === "application/pdf") {
        // Process PDF using existing processor
        const result = await fileProcessor.processFile(
          file.buffer,
          file.originalname
        );
        processedContent = result.content || "";
      } else if (
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ) {
        // Process Office documents
        const result = await fileProcessor.processFile(
          file.buffer,
          file.originalname
        );
        processedContent = result.content || "";
      } else if (mimeType.startsWith("image/")) {
        // For images, use Tesseract.js to extract text
        console.log(`[OCR] Initializing Tesseract.js for ${sanitizedFilename}`);
        try {
          const {
            data: { text },
          } = await Tesseract.recognize(file.buffer, "eng", {
            // logger: (m) => console.log(m), // Optional: for detailed logging
          });
          processedContent = text;
          console.log(
            `[OCR] Tesseract.js finished successfully for ${sanitizedFilename}`
          );
        } catch (ocrError) {
          console.error(
            `[OCR] Tesseract.js processing failed for ${sanitizedFilename}:`,
            ocrError
          );
          throw new Error(
            `Failed to process image with OCR: ${ocrError.message}`
          );
        }
      } else {
        // For other files, store basic metadata
        processedContent = `[Binary file: ${sanitizedFilename}, ${file.size} bytes]`;
      }
    } catch (processingError) {
      console.error("Error processing file content:", processingError);
      return res.status(500).json({
        success: false,
        error: `Failed to process file content: ${processingError.message}`,
      });
    }

    // Calculate content hash for integrity
    const contentHash = fileSecurityUtils.calculateHash(file.buffer);

    // Create file entry
    const fileEntry = {
      fileName: sanitizedFilename,
      mimeType: file.mimetype,
      size: file.size,
      source: "local_upload",
      processedContent: processedContent.substring(0, 10485760), // Limit to 10MB
      base64Content: req.body.base64Content || null, // Save the base64 content
      contentHash: contentHash,
      uploadedAt: new Date(),
      scanStatus: "clean", // In production, this would be 'pending' until virus scan completes
      lastScannedAt: new Date(),
      courseId: null, // Terminal files don't require courseId
    };

    // Add file to user's files
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $push: { googleDriveFiles: fileEntry },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        error: "Failed to save file",
      });
    }

    // Get the newly added file
    const addedFile =
      updatedUser.googleDriveFiles[updatedUser.googleDriveFiles.length - 1];

    console.log(
      `Terminal file uploaded successfully: ${sanitizedFilename} for user: ${userId}`
    );

    // Return success with file metadata (not content)
    res.json({
      success: true,
      file: {
        id: addedFile._id,
        fileName: addedFile.fileName,
        mimeType: addedFile.mimeType,
        size: addedFile.size,
        source: addedFile.source,
        uploadedAt: addedFile.uploadedAt,
        preview:
          processedContent.substring(0, 200) +
          (processedContent.length > 200 ? "..." : ""),
      },
    });
  } catch (error) {
    console.error(`Error in processTerminalFile:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process file",
    });
  }
};

/**
 * Import Google Drive file for terminal use (without courseId)
 */
const importTerminalGoogleDriveFile = async (req, res) => {
  try {
    const { userId } = req.auth();
    if (!userId)
      return res.status(401).json({ success: false, error: "Not signed in" });

    const { fileId } = req.body;

    if (!fileId) {
      return res
        .status(400)
        .json({ success: false, error: "File ID is required" });
    }

    const user = await User.findOne({ userId }).select(
      "+googleDrive.accessToken +googleDrive.refreshToken"
    );
    if (!user || !user.googleDrive.connected) {
      return res
        .status(400)
        .json({ success: false, error: "Google Drive not connected" });
    }

    // Check if file already imported
    const existingFile = user.googleDriveFiles.find((f) => f.fileId === fileId);
    if (existingFile) {
      return res
        .status(400)
        .json({ success: false, error: "File already imported" });
    }

    // Get file metadata from Google Drive
    let tokens = {
      access_token: user.googleDrive.accessToken,
      refresh_token: user.googleDrive.refreshToken,
    };

    const googleDriveService = require("../services/googleDrive/googleDriveService");
    const fileData = await googleDriveService.getFile(tokens, fileId);

    // Security check: Validate file type
    const allowedGoogleTypes = [
      "application/vnd.google-apps.document",
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.google-apps.presentation",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (
      !allowedGoogleTypes.includes(fileData.mimeType) &&
      !fileData.mimeType.startsWith("text/") &&
      !fileData.mimeType.startsWith("image/")
    ) {
      return res.status(400).json({
        success: false,
        error: "File type not allowed for security reasons",
      });
    }

    // Add file to user's imported files
    const fileEntry = {
      fileId: fileData.id,
      fileName: fileData.name.substring(0, 255),
      mimeType: fileData.mimeType,
      size: parseInt(fileData.size) || 0,
      source: "google_drive",
      webViewLink: fileData.webViewLink || "",
      iconLink: fileData.iconLink || "",
      uploadedAt: new Date(),
      googleDriveModifiedAt: fileData.modifiedTime
        ? new Date(fileData.modifiedTime)
        : new Date(),
      courseId: null, // Terminal files don't require courseId
      scanStatus: "clean", // Google Drive files are pre-scanned
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
      success: true,
      message: "File imported successfully",
      file: fileEntry,
    });
  } catch (error) {
    console.error("Error importing terminal Google Drive file:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Remove file from terminal
 */
const removeTerminalFile = async (req, res) => {
  try {
    const { userId } = req.auth();
    if (!userId)
      return res.status(401).json({ success: false, error: "Not signed in" });

    const { fileId } = req.params;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $pull: { googleDriveFiles: { _id: fileId } } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "File removed successfully" });
  } catch (error) {
    console.error("Error removing terminal file:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get content of a local terminal file
 */
const getTerminalFileContent = async (req, res) => {
  try {
    const { userId } = req.auth();
    if (!userId)
      return res.status(401).json({ success: false, error: "Not signed in" });

    const { fileId } = req.params;

    console.log(
      `[getTerminalFileContent] Getting content for file: ${fileId}, user: ${userId}`
    );

    // Use aggregation pipeline to properly retrieve the processedContent field
    const result = await User.aggregate([
      // Match the user
      { $match: { userId } },

      // Unwind the googleDriveFiles array
      { $unwind: "$googleDriveFiles" },

      // Match the specific file
      {
        $match: { "googleDriveFiles._id": new mongoose.Types.ObjectId(fileId) },
      },

      // Project only the fields we need, explicitly including processedContent
      {
        $project: {
          _id: 0,
          file: {
            _id: "$googleDriveFiles._id",
            fileName: "$googleDriveFiles.fileName",
            mimeType: "$googleDriveFiles.mimeType",
            size: "$googleDriveFiles.size",
            source: "$googleDriveFiles.source",
            uploadedAt: "$googleDriveFiles.uploadedAt",
            processedContent: "$googleDriveFiles.processedContent",
            contentHash: "$googleDriveFiles.contentHash",
            scanStatus: "$googleDriveFiles.scanStatus",
          },
        },
      },
    ]);

    if (!result || result.length === 0) {
      console.error(
        `[getTerminalFileContent] File not found: ${fileId} for user: ${userId}`
      );
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    const file = result[0].file;

    console.log(`[getTerminalFileContent] File found:`, {
      id: file._id,
      fileName: file.fileName,
      source: file.source,
      hasContent: !!file.processedContent,
      contentLength: file.processedContent ? file.processedContent.length : 0,
    });

    // Security check: Only allow local_upload files
    if (file.source !== "local_upload") {
      return res.status(400).json({
        success: false,
        error:
          "This endpoint only supports local files. Use Google Drive API for Drive files.",
      });
    }

    // Return file content and metadata
    res.json({
      success: true,
      file: {
        id: file._id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        source: file.source,
        uploadedAt: file.uploadedAt,
        content: file.processedContent || "",
        contentHash: file.contentHash,
        // For compatibility with Google Drive files
        webViewLink: "",
        iconLink: "",
        wordCount: file.processedContent
          ? file.processedContent.split(/\s+/).filter((word) => word.length > 0)
              .length
          : 0,
        preview: file.processedContent
          ? file.processedContent.substring(0, 500) +
            (file.processedContent.length > 500 ? "..." : "")
          : "",
      },
    });
  } catch (error) {
    console.error("Error getting terminal file content:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve file content",
    });
  }
};

/**
 * Get full metadata for a local terminal file
 */
const getTerminalFile = async (req, res) => {
  try {
    const { userId } = req.auth();
    if (!userId)
      return res.status(401).json({ success: false, error: "Not signed in" });

    const { fileId } = req.params;

    const user = await User.findOne(
      { userId, "googleDriveFiles._id": new mongoose.Types.ObjectId(fileId) },
      { "googleDriveFiles.$": 1 }
    );

    if (!user || !user.googleDriveFiles || user.googleDriveFiles.length === 0) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const file = user.googleDriveFiles[0];

    // Security check: Only return local files
    if (file.source !== "local_upload") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error("Error getting terminal file:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve file" });
  }
};

module.exports = {
  fileProcessingController,
  upload,
  processTerminalFile,
  importTerminalGoogleDriveFile,
  removeTerminalFile,
  getTerminalFileContent,
  getTerminalFile,
};
