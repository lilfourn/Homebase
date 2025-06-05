const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate OAuth URL for user consent
   */
  getAuthUrl(userId) {
    const scopes = [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes.join(" "), // Join scopes with space
      state: userId, // Pass userId in state to link tokens to user
      prompt: "consent", // Force consent to ensure refresh token
    });
  }

  /**
   * Get picker configuration including OAuth token
   */
  async getPickerConfig(tokens) {
    try {
      // Debug: Log environment variables
      console.log(
        "GOOGLE_API_KEY:",
        process.env.GOOGLE_API_KEY ? "SET" : "NOT SET"
      );
      console.log(
        "GOOGLE_CLIENT_ID:",
        process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET"
      );
      console.log(
        "GOOGLE_APP_ID:",
        process.env.GOOGLE_APP_ID ? "SET (optional)" : "NOT SET (optional)"
      );

      // Validate required environment variables
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is not set in environment variables");
      }

      if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error("GOOGLE_CLIENT_ID is not set in environment variables");
      }

      // Ensure we have a valid access token
      let accessToken = tokens.access_token;

      // Check if token needs refresh
      if (tokens.expiry_date && new Date() >= new Date(tokens.expiry_date)) {
        const refreshedTokens = await this.refreshAccessToken(
          tokens.refresh_token
        );
        accessToken = refreshedTokens.access_token;
      }

      const config = {
        accessToken,
        developerKey: process.env.GOOGLE_API_KEY,
        clientId: process.env.GOOGLE_CLIENT_ID,
      };

      // Only add appId if it's set (it's optional)
      if (process.env.GOOGLE_APP_ID) {
        config.appId = process.env.GOOGLE_APP_ID;
      }

      console.log("Picker config being returned:", {
        ...config,
        accessToken: "***HIDDEN***",
        developerKey: config.developerKey
          ? `${config.developerKey.substring(0, 10)}...`
          : "NOT SET",
      });

      return config;
    } catch (error) {
      console.error("Error getting picker config:", error);
      throw new Error("Failed to get picker configuration");
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw new Error("Failed to exchange authorization code");
    }
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(tokens) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      return data;
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw new Error("Failed to fetch Google user info");
    }
  }

  /**
   * List files from user's Google Drive
   */
  async listFiles(tokens, pageToken = null, pageSize = 20) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });

      const response = await drive.files.list({
        pageSize,
        pageToken,
        fields:
          "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink)",
        orderBy: "modifiedTime desc",
      });

      return response.data;
    } catch (error) {
      console.error("Error listing files:", error);
      throw new Error("Failed to list Google Drive files");
    }
  }

  /**
   * Get file metadata
   */
  async getFile(tokens, fileId) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });

      const response = await drive.files.get({
        fileId,
        fields:
          "id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents",
      });

      return response.data;
    } catch (error) {
      console.error("Error getting file:", error);
      throw new Error("Failed to get file details");
    }
  }

  /**
   * Download file content (handles both binary files and Google Docs)
   */
  async downloadFile(tokens, fileId) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });

      // First, get file metadata to check the mime type
      const fileMetadata = await drive.files.get({
        fileId,
        fields: "mimeType, name"
      });

      const mimeType = fileMetadata.data.mimeType;

      // Check if it's a Google Docs file that needs export
      const googleDocsTypes = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/pdf',
        'application/vnd.google-apps.presentation': 'application/pdf',
        'application/vnd.google-apps.drawing': 'application/pdf'
      };

      if (googleDocsTypes[mimeType]) {
        // Export Google Docs files as PDF
        const response = await drive.files.export(
          { 
            fileId, 
            mimeType: googleDocsTypes[mimeType] 
          },
          { responseType: "stream" }
        );
        return response.data;
      } else {
        // Download binary files normally
        const response = await drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream" }
        );
        return response.data;
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      throw new Error("Failed to download file: " + error.message);
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(tokens, fileMetadata, fileContent) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          body: fileContent,
        },
        fields: "id, name, webViewLink",
      });

      return response.data;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(tokens, folderName, parentId = null) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });

      const fileMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id, name",
      });

      return response.data;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw new Error("Failed to create folder");
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw new Error("Failed to refresh access token");
    }
  }
}

module.exports = new GoogleDriveService();
