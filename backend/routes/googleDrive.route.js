const express = require("express");
const { requireAuth } = require("@clerk/express");
const {
  getAuthUrl,
  handleCallback,
  disconnect,
  listFiles,
  importFile,
  importFiles,
  removeFile,
  getImportedFiles,
  getPickerConfig,
} = require("../controllers/googleDrive.controller");

const router = express.Router();

// Get OAuth URL for authorization
router.get("/auth-url", requireAuth(), getAuthUrl);

// Handle OAuth callback (no auth required as this comes from Google)
router.get("/callback", handleCallback);

// Disconnect Google Drive
router.post("/disconnect", requireAuth(), disconnect);

// Get picker configuration
router.get("/picker-config", requireAuth(), getPickerConfig);

// List files from Google Drive (kept for backwards compatibility)
router.get("/files", requireAuth(), listFiles);

// Import single file from Google Drive
router.post("/import", requireAuth(), importFile);

// Import multiple files from Google Drive
router.post("/import-multiple", requireAuth(), importFiles);

// Remove imported file
router.delete("/files/:fileId", requireAuth(), removeFile);

// Get imported files
router.get("/imported", requireAuth(), getImportedFiles);

module.exports = router;
