const Course = require("../models/course.model");
const Syllabus = require("../models/syllabus.model");
const User = require("../models/users.model");
const { getAuth } = require("@clerk/express");
const syllabusProcessingService = require("../services/syllabusProcessingService");
const TAMatchingService = require("../services/taMatchingService");
const { ensureUserNames } = require("../utils/nameParser");

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
      userId: auth.userId,
    });

    if (existingSyllabus) {
      console.log(`Updating existing syllabus for course ${courseId}`);
      // Update existing syllabus
      existingSyllabus.fileId = file.id;
      existingSyllabus.fileName = file.name;
      existingSyllabus.mimeType = file.mimeType;
      existingSyllabus.size = file.sizeBytes;
      existingSyllabus.webViewLink = file.webViewLink;
      existingSyllabus.webContentLink = file.webContentLink;
      existingSyllabus.isProcessed = false;
      existingSyllabus.processingError = null;
      existingSyllabus.extractedContent = "";
      existingSyllabus.parsedData = undefined;
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

// Process syllabus with AI
exports.processSyllabus = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the syllabus
    const syllabus = await Syllabus.findOne({
      courseInstanceId,
      userId: auth.userId,
    });

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Check if already processed
    if (syllabus.isProcessed) {
      return res.status(200).json({
        message: "Syllabus already processed",
        isProcessed: true,
        parsedData: syllabus.parsedData,
      });
    }

    // Start processing asynchronously
    syllabusProcessingService
      .processSyllabus(syllabus._id)
      .then(() => {
        console.log(
          `Syllabus processing completed for course: ${courseInstanceId}`
        );
      })
      .catch((error) => {
        console.error(
          `Syllabus processing failed for course: ${courseInstanceId}`,
          error
        );
      });

    res.status(202).json({
      message: "Syllabus processing started",
      isProcessed: false,
      status: "processing",
    });
  } catch (error) {
    console.error("Error starting syllabus processing:", error);
    res.status(500).json({
      message: "Error starting syllabus processing",
      error: error.message,
    });
  }
};

// Get syllabus processing status
exports.getProcessingStatus = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const status = await syllabusProcessingService.getProcessingStatus(
      courseInstanceId,
      auth.userId
    );

    res.status(200).json(status);
  } catch (error) {
    console.error("Error getting processing status:", error);
    res.status(500).json({
      message: "Error getting processing status",
      error: error.message,
    });
  }
};

// Get parsed syllabus data
exports.getParsedData = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await syllabusProcessingService.getParsedData(
      courseInstanceId,
      auth.userId
    );

    res.status(200).json(data);
  } catch (error) {
    console.error("Error getting parsed data:", error);

    if (error.message === "Syllabus not found") {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === "Syllabus has not been processed yet") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: "Error getting parsed data",
      error: error.message,
    });
  }
};

// Reprocess syllabus
exports.reprocessSyllabus = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Start reprocessing asynchronously
    syllabusProcessingService
      .reprocessSyllabus(courseInstanceId, auth.userId)
      .then(() => {
        console.log(
          `Syllabus reprocessing completed for course: ${courseInstanceId}`
        );
      })
      .catch((error) => {
        console.error(
          `Syllabus reprocessing failed for course: ${courseInstanceId}`,
          error
        );
      });

    res.status(202).json({
      message: "Syllabus reprocessing started",
      status: "processing",
    });
  } catch (error) {
    console.error("Error starting syllabus reprocessing:", error);
    res.status(500).json({
      message: "Error starting syllabus reprocessing",
      error: error.message,
    });
  }
};

// Update parsed syllabus data
exports.updateParsedData = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const { parsedData } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!parsedData) {
      return res.status(400).json({ message: "Parsed data is required" });
    }

    // Find the syllabus
    const syllabus = await Syllabus.findOne({
      courseInstanceId,
      userId: auth.userId,
    });

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Validate the parsed data structure
    const validatedData = {
      gradingBreakdown: parsedData.gradingBreakdown || {},
      assignmentDates: parsedData.assignmentDates || [],
      examDates: parsedData.examDates || [],
      contacts: parsedData.contacts || [],
      confidence: parsedData.confidence || 1.0,
      manuallyEdited: true,
      lastEditedAt: new Date(),
    };

    // Update the parsed data
    syllabus.parsedData = validatedData;
    syllabus.isProcessed = true;
    await syllabus.save();

    res.status(200).json({
      message: "Parsed data updated successfully",
      parsedData: validatedData,
    });
  } catch (error) {
    console.error("Error updating parsed data:", error);
    res.status(500).json({
      message: "Error updating parsed data",
      error: error.message,
    });
  }
};

// Add a TA to syllabus manually
exports.addTAManually = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const { taData } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!taData || !taData.name || !taData.email) {
      return res.status(400).json({
        message: "TA name and email are required",
      });
    }

    // Find the syllabus
    const syllabus = await Syllabus.findOne({
      courseInstanceId,
      userId: auth.userId,
    });

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Ensure parsedData exists
    if (!syllabus.parsedData) {
      syllabus.parsedData = {
        gradingBreakdown: {},
        assignmentDates: [],
        examDates: [],
        contacts: [],
        confidence: 1,
      };
    }

    // Ensure contacts array exists
    if (!syllabus.parsedData.contacts) {
      syllabus.parsedData.contacts = [];
    }

    // Add the new TA
    const newTA = {
      name: taData.name,
      role: "TA",
      email: taData.email,
      phone: taData.phone || "",
      officeHours: taData.officeHours || "",
      assignmentRule: taData.assignmentRule || "",
    };

    syllabus.parsedData.contacts.push(newTA);
    syllabus.parsedData.manuallyEdited = true;
    syllabus.parsedData.lastEditedAt = new Date();

    // Mark TA setup as completed since a TA was added
    syllabus.taSetupStatus = "completed";

    await syllabus.save();

    res.status(200).json({
      message: "TA added successfully",
      ta: newTA,
      allContacts: syllabus.parsedData.contacts,
    });
  } catch (error) {
    console.error("Error adding TA manually:", error);
    res.status(500).json({
      message: "Error adding TA",
      error: error.message || "Unknown error",
    });
  }
};

// Get matched TA for the current user
exports.getMatchedTA = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get user information
    let user = await User.findOne({ userId: auth.userId });
    if (!user) {
      console.error("User not found for userId:", auth.userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Try to extract lastName from fullName if needed
    user = ensureUserNames(user.toObject());

    // Get syllabus with parsed data
    const syllabus = await Syllabus.findOne({
      courseInstanceId,
      userId: auth.userId,
    });

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    if (!syllabus.isProcessed || !syllabus.parsedData) {
      return res.status(400).json({
        message: "Syllabus has not been processed yet",
        needsProcessing: true,
      });
    }

    // Ensure parsedData has contacts array
    if (!syllabus.parsedData.contacts) {
      console.log("No contacts found in parsed data");
      syllabus.parsedData.contacts = [];
    }

    // Get the matching result
    const matchResult = TAMatchingService.getDetailedMatch(
      user,
      syllabus.parsedData.contacts
    );

    res.status(200).json({
      matchedTA: matchResult.matchedTA,
      allTAs: matchResult.allTAs,
      matchCriteria: matchResult.matchCriteria,
      userInfo: {
        hasLastName: !!user.lastName,
        hasStudentId: !!user.studentId,
      },
      taSetupStatus: syllabus.taSetupStatus,
    });
  } catch (error) {
    console.error("Error getting matched TA:", error);
    res.status(500).json({
      message: "Error getting matched TA",
      error: error.message || "Unknown error",
    });
  }
};

// Update TA setup status
exports.updateTASetupStatus = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const { status } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate status
    const validStatuses = ["pending", "skipped", "no_ta", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Invalid status. Must be one of: pending, skipped, no_ta, completed",
      });
    }

    // Find the syllabus
    const syllabus = await Syllabus.findOne({
      courseInstanceId,
      userId: auth.userId,
    });

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Update the TA setup status
    syllabus.taSetupStatus = status;
    await syllabus.save();

    res.status(200).json({
      message: "TA setup status updated successfully",
      taSetupStatus: status,
    });
  } catch (error) {
    console.error("Error updating TA setup status:", error);
    res.status(500).json({
      message: "Error updating TA setup status",
      error: error.message || "Unknown error",
    });
  }
};
