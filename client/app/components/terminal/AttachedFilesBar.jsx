"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Paperclip, 
  Upload,
  FolderOpen,
  Loader2,
  AlertCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import FileAttachment from "./FileAttachment";
import FilePreviewDialog from "./FilePreviewDialog";
import { processUploadedFile, processGoogleDriveFile } from "@/app/api/fileProcessing.api";
import { useAuth } from "@clerk/nextjs";

export default function AttachedFilesBar({ 
  attachedFiles,
  setAttachedFiles,
  selectedGoogleDriveFiles,
  courseFiles,
  onFileSelect,
  onFileRemove,
  customColors,
  className,
  maxFiles = 5
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);
  const { getToken } = useAuth();

  // Handle file drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await handleFilesSelected(files);
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle file selection from input
  const handleFileInput = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    await handleFilesSelected(files);
  }, []);

  // Process selected files
  const handleFilesSelected = async (files) => {
    setUploadError(null);
    
    // Check file limit
    if (attachedFiles.length + files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Process each file
    for (const file of files) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`${file.name} is too large (max 10MB)`);
        continue;
      }

      // Add file to attached files with processing state
      const tempFile = {
        id: `temp-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        processing: true,
        file: file // Keep original file for upload
      };

      setAttachedFiles(prev => [...prev, tempFile]);

      try {
        // Get auth token
        const token = await getToken();
        
        // Process the file
        const result = await processUploadedFile(file, token);
        
        // Update file with processed data
        setAttachedFiles(prev => prev.map(f => 
          f.id === tempFile.id 
            ? {
                ...f,
                ...result,
                processing: false,
                processed: true,
                error: null
              }
            : f
        ));
      } catch (error) {
        console.error("Error processing file:", error);
        
        // Update file with error
        setAttachedFiles(prev => prev.map(f => 
          f.id === tempFile.id 
            ? {
                ...f,
                processing: false,
                processed: false,
                error: error.error || "Failed to process file"
              }
            : f
        ));
      }
    }
  };

  // Process Google Drive file
  const processGoogleDriveFileHandler = async (file) => {
    // Check if already attached
    if (attachedFiles.some(f => f.fileId === file.id)) {
      return;
    }

    // Check file limit
    if (attachedFiles.length >= maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Add file with processing state
    const tempFile = {
      id: file.id,
      fileId: file.id,
      name: file.name,
      processing: true
    };

    setAttachedFiles(prev => [...prev, tempFile]);

    try {
      // Get auth token
      const token = await getToken();
      
      // Process the file
      const result = await processGoogleDriveFile(file.id, file.name, token);
      
      // Update file with processed data
      setAttachedFiles(prev => prev.map(f => 
        f.id === tempFile.id 
          ? {
              ...f,
              ...result,
              processing: false,
              processed: true,
              error: null
            }
          : f
      ));
    } catch (error) {
      console.error("Error processing Google Drive file:", error);
      
      // Update file with error
      setAttachedFiles(prev => prev.map(f => 
        f.id === tempFile.id 
          ? {
              ...f,
              processing: false,
              processed: false,
              error: error.error || "Failed to process file"
            }
          : f
      ));
    }
  };

  // Remove file
  const handleRemoveFile = (file) => {
    const updatedFiles = attachedFiles.filter(f => f.id !== file.id);
    setAttachedFiles(updatedFiles);
    // Notify parent about file removal
    if (onFileRemove) {
      onFileRemove(file);
    }
  };

  // Handle file preview
  const handlePreview = (file) => {
    setPreviewFile(file);
  };

  return (
    <div 
      className={cn("relative", className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed bg-opacity-90"
            style={{
              borderColor: customColors.primary,
              backgroundColor: `${customColors.primary}10`
            }}
          >
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: customColors.primary }} />
              <p className="text-sm font-medium" style={{ color: customColors.primary }}>
                Drop files here
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Max {maxFiles} files, 10MB each
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached files display */}
      {attachedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Attached Files ({attachedFiles.length}/{maxFiles})
              </span>
            </div>
            {attachedFiles.length > 0 && (
              <button
                onClick={() => {
                  setAttachedFiles([]);
                  // Notify parent about clearing all files
                  if (onFileRemove) {
                    onFileRemove(null); // null indicates all files cleared
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {attachedFiles.map((file) => (
              <FileAttachment
                key={file.id}
                file={file}
                onRemove={handleRemoveFile}
                onPreview={handlePreview}
                customColors={customColors}
                processing={file.processing}
                processed={file.processed}
                error={file.error}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Error message */}
      {uploadError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <X className="w-3 h-3 text-red-600" />
          </button>
        </motion.div>
      )}


      {/* File Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        customColors={customColors}
      />
    </div>
  );
}