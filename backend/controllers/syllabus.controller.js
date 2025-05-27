const Course = require("../models/course.model");
const Syllabus = require("../models/syllabus.model");
const { getAuth } = require("@clerk/express");

// Get syllabus status for a course
exports.getSyllabusStatus = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const course = await Course.findOne({ courseInstanceId });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Verify the course belongs to the authenticated user
    if (course.userId !== auth.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Also get the actual syllabus file information if it exists
    const syllabus = await Syllabus.findOne({ courseInstanceId });

    res.status(200).json({
      hasSyllabus: course.hasSyllabus,
      syllabus: syllabus
        ? {
            fileName: syllabus.fileName,
            uploadedAt: syllabus.createdAt,
            webViewLink: syllabus.webViewLink,
            isProcessed: syllabus.isProcessed,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching syllabus status",
      error: error.message,
    });
  }
};

// Upload syllabus file for a course
exports.uploadSyllabus = async (req, res) => {
  try {
    const { files, courseId } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    // Find the course and verify ownership
    const course = await Course.findOne({ courseInstanceId: courseId });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.userId !== auth.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const file = files[0]; // Take the first file

    // Check if syllabus already exists for this course
    let existingSyllabus = await Syllabus.findOne({
      courseInstanceId: courseId,
    });

    if (existingSyllabus) {
      // Update existing syllabus
      existingSyllabus.fileId = file.id;
      existingSyllabus.fileName = file.name;
      existingSyllabus.mimeType = file.mimeType;
      existingSyllabus.size = file.sizeBytes;
      existingSyllabus.webViewLink = file.webViewLink;
      existingSyllabus.webContentLink = file.webContentLink;
      existingSyllabus.isProcessed = false;
      existingSyllabus.uploadedAt = new Date();

      await existingSyllabus.save();
    } else {
      // Create new syllabus entry
      const newSyllabus = new Syllabus({
        userId: auth.userId,
        courseId: course._id,
        courseInstanceId: courseId,
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        size: file.sizeBytes,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        isProcessed: false,
        uploadedAt: new Date(),
      });

      await newSyllabus.save();
      existingSyllabus = newSyllabus;
    }

    // Update the course's hasSyllabus status
    course.hasSyllabus = true;
    await course.save();

    res.status(200).json({
      message: "Syllabus uploaded successfully",
      syllabus: {
        fileName: existingSyllabus.fileName,
        uploadedAt: existingSyllabus.uploadedAt,
        webViewLink: existingSyllabus.webViewLink,
        isProcessed: existingSyllabus.isProcessed,
      },
    });
  } catch (error) {
    console.error("Error uploading syllabus:", error);
    res.status(500).json({
      message: "Error uploading syllabus",
      error: error.message,
    });
  }
};

// Get syllabus details for a course
exports.getSyllabus = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const syllabus = await Syllabus.findOne({ courseInstanceId });

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Verify the syllabus belongs to the authenticated user
    if (syllabus.userId !== auth.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ syllabus });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching syllabus",
      error: error.message,
    });
  }
};
