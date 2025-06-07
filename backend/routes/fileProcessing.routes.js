const express = require("express");
const router = express.Router();
const { requireAuth } = require("@clerk/express");
const {
  fileProcessingController,
  upload,
  processTerminalFile,
  importTerminalGoogleDriveFile,
  removeTerminalFile,
  getTerminalFileContent,
  getTerminalFile,
} = require("../controllers/fileProcessingController");

// Process uploaded file
router.post(
  "/process/upload",
  requireAuth(),
  upload.single("file"),
  fileProcessingController.processUploadedFile
);

// Process Google Drive file
router.post(
  "/process/google-drive",
  requireAuth(),
  fileProcessingController.processGoogleDriveFile
);

// Process multiple files
router.post(
  "/process/multiple",
  requireAuth(),
  fileProcessingController.processMultipleFiles
);

// Terminal-specific file operations
// Upload file for terminal use
router.post(
  "/terminal/upload",
  requireAuth(),
  upload.single("file"),
  processTerminalFile
);

// Import Google Drive file for terminal use
router.post(
  "/terminal/import-google-drive",
  requireAuth(),
  importTerminalGoogleDriveFile
);

// Remove file from terminal
router.delete("/terminal/file/:fileId", requireAuth(), removeTerminalFile);

// Get local file content
router.get(
  "/terminal/file/:fileId/content",
  requireAuth(),
  getTerminalFileContent
);

// Get full file metadata
router.get("/terminal/file/:fileId", requireAuth(), getTerminalFile);

module.exports = router;
