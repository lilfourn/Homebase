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

module.exports = router;
