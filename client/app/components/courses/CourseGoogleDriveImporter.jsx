"use client";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle,
  CheckCircle,
  Cloud,
  Library,
  LinkIcon,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  associateGoogleDriveFilesToCourse,
  getGooglePickerConfig,
  getImportedFiles,
  importGoogleDriveFiles,
  removeGoogleDriveFile,
} from "../../api/googleDrive.api";
import { Button } from "../ui/button";

// Helper functions moved outside FileListItem for broader use
const getFileIcon = (mimeType) => {
  if (mimeType.includes("folder")) return "📁";
  if (mimeType.includes("document")) return "📄";
  if (mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("presentation")) return "📽️";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("video")) return "🎥";
  if (mimeType.includes("audio")) return "🎵";
  return "📎"; // Default icon
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "N/A";
  if (bytes === 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
};

const FileListItem = ({
  file,
  onRemove,
  isLoading,
  courseId,
  showCourseInfo = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg transition-colors"
      style={
        isHovered
          ? {
              backgroundColor: "var(--custom-soft-secondary-color)",
              color: "var(--custom-soft-secondary-text-color)", // Ensure text color contrasts with hover bg
            }
          : {}
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <span
          className="text-2xl flex-shrink-0"
          style={
            isHovered
              ? { color: "var(--custom-soft-secondary-text-color)" }
              : {}
          }
        >
          {getFileIcon(file.mimeType)}
        </span>
        <div className="min-w-0 flex-1">
          <h4
            className="font-medium text-sm truncate"
            style={
              isHovered
                ? { color: "var(--custom-soft-secondary-text-color)" }
                : {}
            }
          >
            {file.fileName || file.name}
          </h4>
          <p
            className="text-xs"
            style={
              isHovered
                ? {
                    color: "var(--custom-soft-secondary-text-color)",
                    opacity: 0.85,
                  }
                : { opacity: 0.7 }
            }
          >
            {formatFileSize(file.size)} • Imported:{" "}
            {new Date(file.uploadedAt).toLocaleDateString()}
            {file.googleDriveModifiedAt && (
              <>
                {" "}
                • Modified (Drive):{" "}
                {new Date(file.googleDriveModifiedAt).toLocaleDateString()}
              </>
            )}
            {showCourseInfo && file.courseId && (
              <span
                className="ml-2"
                style={{
                  color: isHovered
                    ? "var(--custom-soft-secondary-text-color)"
                    : "var(--custom-primary-color)",
                }}
              >
                Course File
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm cursor-pointer"
            style={{
              color: isHovered
                ? "var(--custom-soft-secondary-text-color)"
                : "var(--custom-primary-color)",
            }}
          >
            View
          </a>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(file.fileId, courseId)}
          disabled={isLoading}
          className="cursor-pointer"
          style={
            isHovered
              ? {
                  borderColor: "var(--custom-soft-secondary-text-color)",
                  color: "var(--custom-soft-secondary-text-color)",
                }
              : {
                  borderColor: "currentColor",
                  color: "#ef4444",
                }
          }
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default function CourseGoogleDriveImporter({ courseId, isConnected }) {
  const { getToken } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importedFiles, setImportedFiles] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [removingFileId, setRemovingFileId] = useState(null);

  // State for "Link from My Library" Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [globalFiles, setGlobalFiles] = useState([]); // All user's imported files
  const [isLoadingGlobalFiles, setIsLoadingGlobalFiles] = useState(false);
  const [selectedFilesForLinking, setSelectedFilesForLinking] = useState(
    new Set()
  );
  const [isAssociatingFiles, setIsAssociatingFiles] = useState(false);

  const pickerApiLoaded = useRef(false);
  const oauthToken = useRef(null);
  const pickerConfigRef = useRef(null);

  const loadImportedFilesForCourse = useCallback(async () => {
    if (!courseId) return;
    setIsLoadingFiles(true);
    try {
      const token = await getToken();
      const response = await getImportedFiles(token, courseId);
      setImportedFiles(response.files || []);
    } catch (err) {
      console.error("Failed to load imported files for course:", err);
      setError(
        err.message || "Could not load files for this course. Try refreshing."
      );
    } finally {
      setIsLoadingFiles(false);
    }
  }, [getToken, courseId]);

  useEffect(() => {
    if (isConnected) {
      loadImportedFilesForCourse();
    }
  }, [isConnected, loadImportedFilesForCourse]);

  useEffect(() => {
    if (!pickerApiLoaded.current && isConnected) {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load("picker", () => {
          pickerApiLoaded.current = true;
        });
      };
      document.body.appendChild(script);
      return () => {
        // Clean up script if component unmounts
        document.body.removeChild(script);
      };
    }
  }, [isConnected]);

  const showPicker = useCallback(async () => {
    if (!pickerApiLoaded.current || !window.gapi?.picker) {
      setError(
        "Google Picker not loaded. Please ensure Google Drive is connected and refresh."
      );
      return;
    }
    if (!courseId) {
      setError("Course information is missing. Cannot import files.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      if (!pickerConfigRef.current) {
        pickerConfigRef.current = await getGooglePickerConfig(token);
      }

      const { accessToken, developerKey, clientId, appId } =
        pickerConfigRef.current;
      oauthToken.current = accessToken;

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
      pickerConfigRef.current = null; // Reset config on error
    }
  }, [getToken, courseId]);

  const handleFilesSelected = async (docs) => {
    setIsImporting(true);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      const result = await importGoogleDriveFiles(token, docs, courseId);
      setSuccess(
        result.message || `${result.files?.length || 0} file(s) processed.`
      );
      await loadImportedFilesForCourse();
    } catch (err) {
      console.error("Failed to import files to course:", err);
      setError(err.message || "Could not import selected files.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveFile = async (fileIdToRemove) => {
    // The confirmation dialog can be more specific now
    if (
      !window.confirm(
        "Are you sure you want to remove this file's link to this course? It will remain in your global library."
      )
    ) {
      return;
    }
    setRemovingFileId(fileIdToRemove);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      // Pass the courseId to disassociate only from this course
      await removeGoogleDriveFile(token, fileIdToRemove, courseId);
      setSuccess("File unlinked from this course successfully!");
      await loadImportedFilesForCourse();
    } catch (err) {
      console.error("Failed to unlink file from course:", err);
      setError(err.message || "Could not unlink file.");
    } finally {
      setRemovingFileId(null);
    }
  };

  // Logic for "Link from My Library" Modal
  const openLinkModal = async () => {
    setError("");
    setSuccess("");
    setIsLoadingGlobalFiles(true);
    setIsLinkModalOpen(true);
    setSelectedFilesForLinking(new Set());
    try {
      const token = await getToken();
      const response = await getImportedFiles(token); // Get all files
      // Filter out files already associated with the current course
      const courseFileIds = new Set(importedFiles.map((f) => f.fileId));
      const availableFiles = (response.files || []).filter(
        (file) =>
          !courseFileIds.has(file.fileId) ||
          (file.courseId && file.courseId.toString() !== courseId) ||
          !file.courseId
      );
      setGlobalFiles(availableFiles);
    } catch (err) {
      console.error("Failed to load global files:", err);
      setError(err.message || "Could not load your library files.");
      setIsLinkModalOpen(false); // Close modal on error
    } finally {
      setIsLoadingGlobalFiles(false);
    }
  };

  const handleToggleFileForLinking = (fileId) => {
    setSelectedFilesForLinking((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleAssociateSelectedFiles = async () => {
    if (selectedFilesForLinking.size === 0) {
      setError("No files selected to link.");
      return;
    }
    setIsAssociatingFiles(true);
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      const result = await associateGoogleDriveFilesToCourse(
        token,
        Array.from(selectedFilesForLinking),
        courseId
      );
      setSuccess(result.message || "Files associated successfully!");
      await loadImportedFilesForCourse();
      setIsLinkModalOpen(false);
    } catch (err) {
      console.error("Failed to associate files:", err);
      setError(err.message || "Could not associate selected files.");
    } finally {
      setIsAssociatingFiles(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="flex flex-col items-center justify-center text-center">
          <Cloud className="h-10 w-10 text-gray-400 mb-3" />
          <h3 className="text-md font-semibold text-gray-700 mb-1">
            Connect Google Drive to Add Files
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Please connect your Google Drive account in the main settings to
            import files here.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/dashboard/settings";
              }
            }}
            className="cursor-pointer"
          >
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center text-green-700">
          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3
          className="text-lg font-medium text-black"
          style={{ color: "#000000" }}
        >
          Course Materials
        </h3>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={openLinkModal}
            disabled={
              isImporting ||
              isLoadingFiles ||
              isLoadingGlobalFiles ||
              isAssociatingFiles
            }
            size="sm"
            variant="outline"
            className="cursor-pointer"
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Select from My Library
          </Button>
          <Button
            onClick={showPicker}
            disabled={isImporting || isLoadingFiles || isAssociatingFiles}
            size="sm"
            className="text-white px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer btn-primary"
            style={{
              backgroundColor: "var(--custom-primary-color)",
              color: "var(--custom-primary-text-color)",
              borderColor: "var(--custom-primary-color)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--custom-hover-primary-color)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--custom-primary-color)")
            }
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add from Drive
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal for Linking Files from Library */}
      {isLinkModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          {/* Dialog box with solid white background */}
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-semibold text-gray-800">
                Select Files from Your Library to Link
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLinkModalOpen(false)}
                className="cursor-pointer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {isLoadingGlobalFiles ? (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto" />
                <p className="mt-2 text-gray-600">Loading your files...</p>
              </div>
            ) : globalFiles.length > 0 ? (
              <>
                <div className="overflow-y-auto flex-grow mb-4 pr-2 space-y-2">
                  {globalFiles.map((file) => (
                    <div
                      key={file.fileId}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors 
                                  ${
                                    selectedFilesForLinking.has(file.fileId)
                                      ? "border-opacity-100"
                                      : "hover:bg-gray-50"
                                  }`}
                      style={
                        selectedFilesForLinking.has(file.fileId)
                          ? {
                              backgroundColor:
                                "var(--custom-soft-secondary-color)",
                              color: "var(--custom-soft-secondary-text-color)",
                              borderColor: "var(--custom-secondary-color)",
                            }
                          : {}
                      }
                      onClick={() => handleToggleFileForLinking(file.fileId)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">
                          {getFileIcon(file.mimeType)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h5
                            className="font-medium text-sm truncate"
                            style={
                              selectedFilesForLinking.has(file.fileId)
                                ? {
                                    color:
                                      "var(--custom-soft-secondary-text-color)",
                                  }
                                : {}
                            }
                          >
                            {file.fileName || file.name}
                          </h5>
                          <p
                            className="text-xs"
                            style={
                              selectedFilesForLinking.has(file.fileId)
                                ? {
                                    color:
                                      "var(--custom-soft-secondary-text-color)",
                                    opacity: 0.8,
                                  }
                                : { color: "#6b7280", opacity: 0.9 }
                            }
                          >
                            {formatFileSize(file.size)}
                            {file.courseId && file.courseId !== courseId && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                Linked to another course
                              </span>
                            )}
                            {!file.courseId && (
                              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                                Not linked to any course
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedFilesForLinking.has(file.fileId)}
                        onChange={() => handleToggleFileForLinking(file.fileId)}
                        className="ml-4 h-5 w-5 rounded focus:ring-opacity-50 cursor-pointer"
                        style={
                          selectedFilesForLinking.has(file.fileId)
                            ? {
                                borderColor: "var(--custom-secondary-color)",
                                color: "var(--custom-primary-color)",
                              }
                            : {
                                borderColor: "var(--custom-primary-color)",
                                color: "var(--custom-primary-color)",
                              }
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setIsLinkModalOpen(false)}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssociateSelectedFiles}
                    disabled={
                      isAssociatingFiles || selectedFilesForLinking.size === 0
                    }
                    className="text-white px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer btn-primary"
                    style={{
                      backgroundColor: "var(--custom-primary-color)",
                      color: "var(--custom-primary-text-color)",
                      borderColor: "var(--custom-primary-color)",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "var(--custom-hover-primary-color)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "var(--custom-primary-color)")
                    }
                  >
                    {isAssociatingFiles ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="mr-2 h-4 w-4" />
                    )}
                    Link Selected ({selectedFilesForLinking.size})
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-gray-600">
                No unlinked files found in your library, or all files are
                already associated with this course.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Display of course-specific files */}
      {isLoadingFiles ? (
        <div className="text-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Loading course files...</p>
        </div>
      ) : importedFiles.length > 0 ? (
        <div className="space-y-2">
          {importedFiles.map((file) => (
            <FileListItem
              key={file.fileId}
              file={file}
              onRemove={handleRemoveFile}
              isLoading={removingFileId === file.fileId}
              courseId={courseId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-gray-300 rounded-lg bg-gray-50">
          <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">
            No files imported for this course yet.
          </p>
          <p className="text-xs text-gray-500">
            Use the buttons above to add materials.
          </p>
        </div>
      )}
    </div>
  );
}
