const express = require("express");
const { requireAuth } = require("@clerk/express");
const router = express.Router();
const syllabusController = require("../controllers/syllabus.controller");

// Route to check syllabus status
router.get(
  "/:courseInstanceId/status",
  requireAuth(),
  syllabusController.getSyllabusStatus
);

// Route to get syllabus details
router.get("/:courseInstanceId", requireAuth(), syllabusController.getSyllabus);

// Route to upload syllabus
router.post("/upload", requireAuth(), syllabusController.uploadSyllabus);

// Route to start syllabus processing
router.post(
  "/:courseInstanceId/process",
  requireAuth(),
  syllabusController.processSyllabus
);

// Route to get processing status
router.get(
  "/:courseInstanceId/processing-status",
  requireAuth(),
  syllabusController.getProcessingStatus
);

// Route to get parsed data
router.get(
  "/:courseInstanceId/parsed-data",
  requireAuth(),
  syllabusController.getParsedData
);

// Route to reprocess syllabus
router.post(
  "/:courseInstanceId/reprocess",
  requireAuth(),
  syllabusController.reprocessSyllabus
);

// Route to update parsed data
router.put(
  "/:courseInstanceId/parsed-data",
  requireAuth(),
  syllabusController.updateParsedData
);

// Route to get matched TA for current user
router.get(
  "/:courseInstanceId/matched-ta",
  requireAuth(),
  syllabusController.getMatchedTA
);

// Route to manually add a TA
router.post(
  "/:courseInstanceId/add-ta",
  requireAuth(),
  syllabusController.addTAManually
);

// Route to update TA setup status
router.put(
  "/:courseInstanceId/ta-setup-status",
  requireAuth(),
  syllabusController.updateTASetupStatus
);

module.exports = router;
