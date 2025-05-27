"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  CheckCircle,
  Cloud,
  FileText,
  Loader2,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  disconnectGoogleDrive,
  getGoogleAuthUrl,
  getGooglePickerConfig,
  getImportedFiles,
  importGoogleDriveFiles,
  removeGoogleDriveFile,
} from "../../api/googleDrive.api";
import { fetchUserByClerkId } from "../../api/users.api";
import { Button } from "../ui/button";

const FileListItem = ({ file, onRemove, isLoading }) => {
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
            {formatFileSize(file.size)} • Imported{" "}
            {new Date(file.uploadedAt).toLocaleDateString()}
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(file.fileId)}
          disabled={isLoading}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
  const [importedFiles, setImportedFiles] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [removingFileId, setRemovingFileId] = useState(null);

  // Google Picker state
  const pickerApiLoaded = useRef(false);
  const oauthToken = useRef(null);
  const pickerConfigRef = useRef(null);

  const loadUserData = async () => {
    if (!clerkUser?.id) {
      console.error("No clerk user ID available");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const data = await fetchUserByClerkId(clerkUser.id);
      setUserData(data);

      if (data?.googleDrive?.connected) {
        await loadImportedFiles();
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError(err.message || "Could not load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && clerkUser?.id) {
      loadUserData();
    }
  }, [clerkUser, isLoaded]);

  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_connected") === "true") {
      setSuccess("Google Drive connected successfully!");
      // Only load user data if clerkUser is available
      if (isLoaded && clerkUser?.id) {
        loadUserData();
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("google_error") === "true") {
      setError("Failed to connect Google Drive. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLoaded, clerkUser]);

  // Load Google Picker API
  useEffect(() => {
    if (!pickerApiLoaded.current && userData?.googleDrive?.connected) {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load("picker", () => {
          pickerApiLoaded.current = true;
        });
      };
      document.body.appendChild(script);
    }
  }, [userData?.googleDrive?.connected]);

  const loadImportedFiles = async () => {
    try {
      const token = await getToken();
      const response = await getImportedFiles(token);
      setImportedFiles(response.files || []);
    } catch (err) {
      console.error("Failed to load imported files:", err);
    }
  };

  const handleConnect = async () => {
    if (!clerkUser?.id) {
      setError("User not authenticated. Please refresh the page.");
      return;
    }

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
      setImportedFiles([]);
      await loadUserData();
    } catch (err) {
      console.error("Failed to disconnect:", err);
      setError(err.message || "Could not disconnect Google Drive.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const showPicker = useCallback(async () => {
    if (!pickerApiLoaded.current || !window.gapi?.picker) {
      setError("Google Picker not loaded. Please refresh the page.");
      return;
    }

    try {
      setError("");
      const token = await getToken();

      // Get picker configuration from backend
      if (!pickerConfigRef.current) {
        pickerConfigRef.current = await getGooglePickerConfig(token);
      }

      const { accessToken, developerKey, clientId, appId } =
        pickerConfigRef.current;
      oauthToken.current = accessToken;

      // Create and show the picker
      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(developerKey)
        .setAppId(appId)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(new window.google.picker.DocsUploadView())
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            await handleFilesSelected(data.docs);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error("Failed to show picker:", err);
      setError(err.message || "Could not open file picker.");
      // Reset picker config to force refresh on next attempt
      pickerConfigRef.current = null;
    }
  }, [getToken]);

  const handleFilesSelected = async (docs) => {
    try {
      setIsImporting(true);
      setError("");

      const token = await getToken();
      const result = await importGoogleDriveFiles(token, docs);

      if (result.skipped > 0) {
        setSuccess(
          `${result.files.length} file(s) imported successfully. ${result.skipped} file(s) were already imported.`
        );
      } else {
        setSuccess(`${result.files.length} file(s) imported successfully!`);
      }

      await loadImportedFiles();
    } catch (err) {
      console.error("Failed to import files:", err);
      setError(err.message || "Could not import files.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to remove this file?")) {
      return;
    }

    try {
      setRemovingFileId(fileId);
      const token = await getToken();
      await removeGoogleDriveFile(token, fileId);
      setSuccess("File removed successfully!");
      await loadImportedFiles();
    } catch (err) {
      console.error("Failed to remove file:", err);
      setError(err.message || "Could not remove file.");
    } finally {
      setRemovingFileId(null);
    }
  };

  if (!isLoaded || !clerkUser?.id) {
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

  if (isLoading && !userData) {
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">
                Imported Files
              </h3>
              <Button
                onClick={showPicker}
                disabled={isImporting}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Files
                  </>
                )}
              </Button>
            </div>

            {importedFiles.length > 0 ? (
              <div className="space-y-2">
                {importedFiles.map((file) => (
                  <FileListItem
                    key={file.fileId}
                    file={file}
                    onRemove={handleRemoveFile}
                    isLoading={removingFileId === file.fileId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Cloud className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  No files imported yet
                </p>
                <Button
                  onClick={showPicker}
                  disabled={isImporting}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Import Files from Drive
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
