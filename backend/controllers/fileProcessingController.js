const { FileProcessor } = require("../services/tools/fileProcessor");
const googleDriveService = require("../services/googleDrive/googleDriveService");
const User = require("../models/users.model");
const multer = require("multer");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept common document formats
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'text/csv',
      'text/markdown',
      'text/html',
      'application/json'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
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
          error: "No file uploaded" 
        });
      }

      const processor = new FileProcessor({
        chunkSize: 6000,
        preserveStructure: true,
        cleanWhitespace: true,
        includeMetadata: true
      });

      // Process the file
      const result = await processor.processFile(req.file.buffer, {
        fileName: req.file.originalname
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
        wordCount: result.content.split(/\s+/).filter(word => word.length > 0).length,
        preview: result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '')
      };

      res.json(response);
    } catch (error) {
      console.error("Error processing uploaded file:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to process file" 
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
        return res.status(400).json({ 
          success: false, 
          error: "File ID and name are required" 
        });
      }

      // Get user's Google Drive tokens
      const user = await User.findOne({ userId }).select(
        "+googleDrive.accessToken +googleDrive.refreshToken"
      );

      if (!user || !user.googleDrive.connected) {
        return res.status(400).json({ 
          success: false, 
          error: "Google Drive not connected" 
        });
      }

      // Prepare tokens
      let tokens = {
        access_token: user.googleDrive.accessToken,
        refresh_token: user.googleDrive.refreshToken,
        expiry_date: user.googleDrive.tokenExpiry,
      };

      // Refresh token if needed
      if (user.googleDrive.tokenExpiry && new Date() >= user.googleDrive.tokenExpiry) {
        tokens = await googleDriveService.refreshAccessToken(user.googleDrive.refreshToken);
        
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

      // Download file from Google Drive
      const fileStream = await googleDriveService.downloadFile(tokens, fileId);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Process the file
      const processor = new FileProcessor({
        chunkSize: 6000,
        preserveStructure: true,
        cleanWhitespace: true,
        includeMetadata: true
      });

      const result = await processor.processFile(fileBuffer, { fileName });

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
        wordCount: result.content.split(/\s+/).filter(word => word.length > 0).length,
        preview: result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '')
      };

      res.json(response);
    } catch (error) {
      console.error("Error processing Google Drive file:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to process file" 
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
          error: "No files provided" 
        });
      }

      // Limit number of files
      if (files.length > 5) {
        return res.status(400).json({ 
          success: false, 
          error: "Maximum 5 files can be processed at once" 
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
            body: file
          };
          
          const mockRes = {
            json: (data) => {
              if (data.success) {
                results.push(data);
              } else {
                errors.push({ fileName: file.fileName, error: data.error });
              }
            },
            status: () => mockRes
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
        totalWordCount: results.reduce((sum, r) => sum + r.wordCount, 0)
      });
    } catch (error) {
      console.error("Error processing multiple files:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to process files" 
      });
    }
  }
};

module.exports = {
  fileProcessingController,
  upload
};