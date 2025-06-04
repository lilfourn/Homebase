const Syllabus = require("../models/syllabus.model");
const User = require("../models/users.model");
const googleDriveService = require("./googleDrive/googleDriveService");
const aiService = require("./providers/aiService");
const { FileProcessor } = require("./tools/fileProcessor");

class SyllabusProcessingService {
  /**
   * Process a syllabus file: extract text and parse with AI
   */
  async processSyllabus(syllabusId) {
    let syllabus;

    try {
      // Get syllabus document
      syllabus = await Syllabus.findById(syllabusId);
      if (!syllabus) {
        throw new Error("Syllabus not found");
      }

      // Mark as processing started
      syllabus.isProcessed = false;
      syllabus.processingError = null;
      await syllabus.save();

      console.log(`Starting to process syllabus: ${syllabus.fileName}`);

      // Get user's Google Drive tokens
      const user = await User.findOne({ userId: syllabus.userId }).select(
        "+googleDrive.accessToken +googleDrive.refreshToken"
      );

      if (!user || !user.googleDrive.connected) {
        throw new Error("Google Drive not connected for this user");
      }

      if (!user.googleDrive.accessToken || !user.googleDrive.refreshToken) {
        throw new Error("User Google Drive tokens not found");
      }

      // Prepare tokens object for Google Drive service
      let tokens = {
        access_token: user.googleDrive.accessToken,
        refresh_token: user.googleDrive.refreshToken,
        expiry_date: user.googleDrive.tokenExpiry,
      };

      // Check if token needs refresh
      if (
        user.googleDrive.tokenExpiry &&
        new Date() >= user.googleDrive.tokenExpiry
      ) {
        console.log("Refreshing expired Google Drive token...");
        tokens = await googleDriveService.refreshAccessToken(
          user.googleDrive.refreshToken
        );

        // Update tokens in database
        await User.findOneAndUpdate(
          { userId: syllabus.userId },
          {
            $set: {
              "googleDrive.accessToken": tokens.access_token,
              "googleDrive.tokenExpiry": new Date(tokens.expiry_date),
            },
          }
        );
      }

      // Extract text from PDF
      const extractedText = await this.extractTextFromPDF(syllabus, tokens);

      // Store extracted content
      syllabus.extractedContent = extractedText;
      await syllabus.save();

      console.log(
        `Extracted ${extractedText.length} characters from ${syllabus.fileName}`
      );

      // Parse with AI
      const parsedData = await this.parseWithAI(extractedText);

      // Store parsed data
      syllabus.parsedData = parsedData;
      syllabus.isProcessed = true;
      syllabus.processingError = null;
      await syllabus.save();

      console.log(`Successfully processed syllabus: ${syllabus.fileName}`);

      return {
        success: true,
        extractedContent: extractedText,
        parsedData: parsedData,
      };
    } catch (error) {
      console.error(`Error processing syllabus ${syllabusId}:`, error);

      // Update syllabus with error
      if (syllabus) {
        syllabus.isProcessed = false;
        syllabus.processingError = error.message;
        await syllabus.save();
      }

      throw error;
    }
  }

  /**
   * Extract text content from any file type using FileProcessor
   */
  async extractTextFromPDF(syllabus, tokens) {
    try {
      // Download file content from Google Drive
      const fileStream = await googleDriveService.downloadFile(
        tokens,
        syllabus.fileId
      );

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Create file processor with optimized settings for syllabus processing
      const processor = new FileProcessor({
        chunkSize: 8000,        // Larger chunks for syllabus content
        preserveStructure: true, // Keep document structure
        cleanWhitespace: true,   // Clean formatting
        includeMetadata: true    // Include file metadata
      });

      // Process the file (works with PDF, DOCX, and other formats)
      const result = await processor.processFile(fileBuffer, {
        fileName: syllabus.fileName
      });

      if (!result.content || result.content.trim().length === 0) {
        throw new Error("No text content found in file");
      }

      // Store metadata if available
      if (result.metadata) {
        syllabus.fileMetadata = result.metadata;
      }

      // Store structure if available (useful for AI parsing)
      if (result.structure) {
        syllabus.documentStructure = result.structure;
      }

      return result.content;
    } catch (error) {
      console.error("Error extracting text from file:", error);
      throw new Error(`File text extraction failed: ${error.message}`);
    }
  }

  /**
   * Parse extracted text with AI service
   */
  async parseWithAI(extractedText) {
    try {
      if (!aiService.isConfigured()) {
        throw new Error("AI service is not properly configured");
      }

      const parsedData = await aiService.parseSyllabusContent(extractedText);

      return parsedData;
    } catch (error) {
      console.error("Error parsing with AI:", error);
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }

  /**
   * Get processing status for a syllabus
   */
  async getProcessingStatus(courseInstanceId, userId) {
    try {
      const syllabus = await Syllabus.findOne({
        courseInstanceId,
        userId,
      });

      if (!syllabus) {
        return {
          exists: false,
          isProcessed: false,
          processingError: null,
        };
      }

      return {
        exists: true,
        isProcessed: syllabus.isProcessed,
        processingError: syllabus.processingError,
        hasExtractedContent: !!syllabus.extractedContent,
        hasParsedData: !!syllabus.parsedData,
        fileName: syllabus.fileName,
        uploadedAt: syllabus.createdAt,
      };
    } catch (error) {
      console.error("Error getting processing status:", error);
      throw new Error(`Failed to get processing status: ${error.message}`);
    }
  }

  /**
   * Reprocess a syllabus (useful for retrying failed processing)
   */
  async reprocessSyllabus(courseInstanceId, userId) {
    try {
      const syllabus = await Syllabus.findOne({
        courseInstanceId,
        userId,
      });

      if (!syllabus) {
        throw new Error("Syllabus not found");
      }

      return await this.processSyllabus(syllabus._id);
    } catch (error) {
      console.error("Error reprocessing syllabus:", error);
      throw error;
    }
  }

  /**
   * Get parsed syllabus data
   */
  async getParsedData(courseInstanceId, userId) {
    try {
      const syllabus = await Syllabus.findOne({
        courseInstanceId,
        userId,
      });

      if (!syllabus) {
        throw new Error("Syllabus not found");
      }

      if (!syllabus.isProcessed) {
        throw new Error("Syllabus has not been processed yet");
      }

      // Convert Map back to Object for gradingBreakdown if needed
      const parsedData = syllabus.parsedData;
      if (parsedData && parsedData.gradingBreakdown instanceof Map) {
        parsedData.gradingBreakdown = Object.fromEntries(
          parsedData.gradingBreakdown
        );
      }

      return {
        extractedContent: syllabus.extractedContent,
        parsedData: parsedData,
        processingError: syllabus.processingError,
        isProcessed: syllabus.isProcessed,
      };
    } catch (error) {
      console.error("Error getting parsed data:", error);
      throw error;
    }
  }
}

module.exports = new SyllabusProcessingService();
