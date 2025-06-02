"use client";

import {
  AlertCircle,
  Check,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  Video,
} from "lucide-react";
import React, { useState } from "react";
import { useGoogleDrivePicker } from "../../../hooks/useGoogleDrivePicker";

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  mimeType?: string;
}

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType?: string;
}

interface FileLibraryProps {
  onFileSelect: (files: SelectedFile[]) => void;
  selectedFiles: SelectedFile[];
  courseColors: { primary: string; secondary: string };
  isDisabled?: boolean;
  courseFiles?: SelectedFile[];
  filesLoading?: boolean;
  courseId?: string;
  onFilesUploaded?: () => void;
}

export default function FileLibrary({
  onFileSelect,
  selectedFiles,
  courseColors,
  isDisabled,
  courseFiles,
  filesLoading = false,
  courseId,
  onFilesUploaded,
}: FileLibraryProps) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Use Google Drive picker hook
  const { openPicker, isLoading: isUploading } = useGoogleDrivePicker({
    courseId,
    onFilesSelected: (result) => {
      setSuccess(
        result.message ||
          `${result.files?.length || 0} file(s) imported successfully.`
      );
      setError("");
      // Trigger parent to reload files
      onFilesUploaded?.();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (errorMessage) => {
      setError(errorMessage);
      setSuccess("");
    },
  });

  // Convert courseFiles to FileItem format
  const files: FileItem[] = courseFiles
    ? courseFiles.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        uploadedAt: new Date(),
        mimeType: f.mimeType,
      }))
    : [];

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
      case "docx":
      case "document":
        return <FileText className="w-4 h-4" />;
      case "xlsx":
      case "spreadsheet":
        return <File className="w-4 h-4" />;
      case "jpg":
      case "png":
      case "jpeg":
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "mp4":
      case "video":
        return <Video className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleFileClick = (file: FileItem) => {
    if (isDisabled) {
      return;
    }

    const isSelected = selectedFiles.some((f) => f.id === file.id);

    if (isSelected) {
      onFileSelect(selectedFiles.filter((f) => f.id !== file.id));
    } else {
      onFileSelect([
        ...selectedFiles,
        {
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          mimeType: file.mimeType,
        },
      ]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (isDisabled || !courseId) return;

    // Since we're using Google Drive, we can't handle local file drops
    // Instead, show a message to use the upload button
    setError('Please use the "Upload from Google Drive" button to add files.');
    setTimeout(() => setError(""), 3000);
  };

  const handleUploadClick = () => {
    if (isDisabled || isUploading) return;

    if (!courseId) {
      setError("Course information is missing. Cannot upload files.");
      return;
    }

    openPicker();
  };

  return (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center text-green-700">
          <Check className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* File List */}
      {filesLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: courseColors.primary }}
          />
          <span className="ml-2 text-sm text-gray-600">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No files found for this course.</p>
          <p className="text-xs mt-1">
            Upload files using the button below to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {files.map((file) => {
            const isSelected = selectedFiles.some((f) => f.id === file.id);
            return (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className={`
                flex items-center justify-between p-3 rounded-lg border transition-all duration-200
                ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:shadow-sm"
                }
                ${isSelected ? "border-2" : "border-gray-200"}
              `}
                style={{
                  borderColor: isSelected ? courseColors.primary : undefined,
                  backgroundColor: isSelected
                    ? courseColors.primary + "10"
                    : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-md"
                    style={{
                      backgroundColor: isSelected
                        ? courseColors.primary + "20"
                        : "#f3f4f6",
                      color: isSelected ? courseColors.primary : "#6b7280",
                    }}
                  >
                    {getFileIcon(file.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Check
                    className="w-5 h-5"
                    style={{ color: courseColors.primary }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Google Drive Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${
            dragActive
              ? "border-opacity-100 bg-opacity-10"
              : "border-opacity-50"
          }
          ${
            isDisabled || isUploading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-opacity-75"
          }
        `}
        style={{
          borderColor: courseColors.primary,
          backgroundColor: dragActive ? courseColors.primary + "10" : undefined,
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        {isUploading ? (
          <Loader2
            className="w-8 h-8 mx-auto mb-2 animate-spin"
            style={{ color: courseColors.primary }}
          />
        ) : (
          <Upload
            className="w-8 h-8 mx-auto mb-2"
            style={{ color: courseColors.primary }}
          />
        )}
        <p className="text-sm font-medium text-gray-700">
          {isUploading
            ? "Opening Google Drive..."
            : "Click to upload from Google Drive"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {isUploading
            ? "Please select files from the picker"
            : "Add files to your course library"}
        </p>
        <button
          className="mt-3 px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
          style={{
            color: courseColors.primary,
            backgroundColor: courseColors.primary + "20",
            borderColor: courseColors.primary,
          }}
          disabled={isDisabled || isUploading}
          onClick={(e) => {
            e.stopPropagation();
            handleUploadClick();
          }}
        >
          {isUploading ? "Loading..." : "Upload from Google Drive"}
        </button>
      </div>
    </div>
  );
}
