const express = require("express");
const router = express.Router();
const { requireAuth } = require("@clerk/express");
const { fileProcessingController, upload } = require("../controllers/fileProcessingController");

// Process uploaded file
router.post(
  "/process/upload",
  requireAuth(),
  upload.single('file'),
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

module.exports = router;