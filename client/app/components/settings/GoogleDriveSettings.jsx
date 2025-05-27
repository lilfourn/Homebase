"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  CheckCircle,
  Cloud,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  disconnectGoogleDrive,
  getGoogleAuthUrl,
  getImportedFiles,
  importGoogleDriveFile,
  listGoogleDriveFiles,
  removeGoogleDriveFile,
} from "../../api/googleDrive.api";
import { fetchUserByClerkId } from "../../api/users.api";
import { Button } from "../ui/button";

const FileListItem = ({ file, onImport, onRemove, isImported, isLoading }) => {
  const getFileIcon = (mimeType) => {
    if (mimeType.includes("folder")) return "📁";
    if (mimeType.includes("document")) return "📄";
    if (mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("presentation")) return "📽️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("image")) return "🖼️";
    if (mimeType.includes("video")) return "🎥";
    if (mimeType.includes("audio")) return "🎵";
    return "📎";
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">
          {getFileIcon(file.mimeType)}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm truncate">
            {file.fileName || file.name}
          </h4>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)} • Modified{" "}
            {new Date(
              file.modifiedTime || file.uploadedAt
            ).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            View
          </a>
        )}
        {isImported ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRemove(file.fileId || file.id)}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onImport(file.id)}
            disabled={isLoading || file.mimeType.includes("folder")}
          >
            Import
          </Button>
        )}
      </div>
    </div>
  );
};

export default function GoogleDriveSettings() {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // File management state
  const [driveFiles, setDriveFiles] = useState([]);
  const [importedFiles, setImportedFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [importingFileId, setImportingFileId] = useState(null);

  useEffect(() => {
    if (isLoaded && clerkUser) {
      loadUserData();
    }
  }, [clerkUser, isLoaded]);

  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_connected") === "true") {
      setSuccess("Google Drive connected successfully!");
      loadUserData();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("google_error") === "true") {
      setError("Failed to connect Google Drive. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchUserByClerkId(clerkUser.id);
      setUserData(data);

      if (data?.googleDrive?.connected) {
        await loadFiles();
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError(err.message || "Could not load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async (loadMore = false) => {
    try {
      setIsLoadingFiles(true);
      setFilesError("");
      const token = await getToken();

      // Load Google Drive files
      const driveResponse = await listGoogleDriveFiles(
        token,
        loadMore ? nextPageToken : null,
        20
      );

      if (loadMore) {
        setDriveFiles([...driveFiles, ...driveResponse.files]);
      } else {
        setDriveFiles(driveResponse.files || []);
      }
      setNextPageToken(driveResponse.nextPageToken || null);

      // Load imported files
      const importedResponse = await getImportedFiles(token);
      setImportedFiles(importedResponse.files || []);
    } catch (err) {
      console.error("Failed to load files:", err);
      setFilesError(err.message || "Could not load files.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError("");
      const token = await getToken();
      const { authUrl } = await getGoogleAuthUrl(token);
      window.location.href = authUrl;
    } catch (err) {
      console.error("Failed to get auth URL:", err);
      setError(err.message || "Could not connect to Google Drive.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect Google Drive? This will remove all imported files."
      )
    ) {
      return;
    }

    try {
      setIsDisconnecting(true);
      setError("");
      const token = await getToken();
      await disconnectGoogleDrive(token);
      setSuccess("Google Drive disconnected successfully.");
      setDriveFiles([]);
      setImportedFiles([]);
      await loadUserData();
    } catch (err) {
      console.error("Failed to disconnect:", err);
      setError(err.message || "Could not disconnect Google Drive.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleImportFile = async (fileId) => {
    try {
      setImportingFileId(fileId);
      const token = await getToken();
      await importGoogleDriveFile(token, fileId);
      setSuccess("File imported successfully!");
      await loadFiles();
    } catch (err) {
      console.error("Failed to import file:", err);
      setError(err.message || "Could not import file.");
    } finally {
      setImportingFileId(null);
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to remove this file?")) {
      return;
    }

    try {
      const token = await getToken();
      await removeGoogleDriveFile(token, fileId);
      setSuccess("File removed successfully!");
      await loadFiles();
    } catch (err) {
      console.error("Failed to remove file:", err);
      setError(err.message || "Could not remove file.");
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="mt-10 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="flex items-center mb-4">
          <Cloud className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">
            Google Drive Integration
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const isConnected = userData?.googleDrive?.connected;

  return (
    <div className="mt-10 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Cloud className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">
            Google Drive Integration
          </h2>
        </div>
        {isConnected && (
          <span className="text-sm text-green-600 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            Connected
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center text-green-700">
          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Connect your Google Drive to easily import and manage files for your
            courses.
          </p>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full sm:w-auto"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Cloud className="mr-2 h-4 w-4" />
                Connect Google Drive
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Connected Account
              </p>
              <p className="text-sm text-gray-600">
                {userData.googleDrive.email}
              </p>
              {userData.googleDrive.lastSynced && (
                <p className="text-xs text-gray-500 mt-1">
                  Last synced:{" "}
                  {new Date(userData.googleDrive.lastSynced).toLocaleString()}
                </p>
              )}
            </div>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Imported Files Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Imported Files
            </h3>
            {importedFiles.length > 0 ? (
              <div className="space-y-2 mb-6">
                {importedFiles.map((file) => (
                  <FileListItem
                    key={file.fileId}
                    file={file}
                    onRemove={handleRemoveFile}
                    isImported={true}
                    isLoading={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6">
                No files imported yet.
              </p>
            )}
          </div>

          {/* Google Drive Files Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">
                Your Google Drive Files
              </h3>
              <Button
                onClick={() => loadFiles(false)}
                variant="outline"
                size="sm"
                disabled={isLoadingFiles}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingFiles ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {filesError && (
              <p className="text-sm text-red-600 mb-3">{filesError}</p>
            )}

            {isLoadingFiles && driveFiles.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : driveFiles.length > 0 ? (
              <div className="space-y-2">
                {driveFiles.map((file) => {
                  const isImported = importedFiles.some(
                    (f) => f.fileId === file.id
                  );
                  return (
                    <FileListItem
                      key={file.id}
                      file={file}
                      onImport={handleImportFile}
                      isImported={isImported}
                      isLoading={importingFileId === file.id}
                    />
                  );
                })}
                {nextPageToken && (
                  <Button
                    onClick={() => loadFiles(true)}
                    variant="outline"
                    className="w-full mt-4"
                    disabled={isLoadingFiles}
                  >
                    {isLoadingFiles ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Load More"
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No files found in your Google Drive.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
