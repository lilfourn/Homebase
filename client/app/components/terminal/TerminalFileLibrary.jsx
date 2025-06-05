"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  FolderOpen, 
  Upload, 
  RefreshCw, 
  Loader2, 
  FileText, 
  CheckCircle,
  Search,
  X,
  File,
  FileImage,
  FileCode,
  FileSpreadsheet,
  HardDrive,
  Cloud,
  AlertCircle,
  Trash2
} from "lucide-react";
import { getImportedFiles } from "@/app/api/googleDrive.api";
import { 
  uploadTerminalFile, 
  removeTerminalFile 
} from "@/app/api/fileProcessing.api";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchUserByClerkId } from "@/app/api/users.api";
import { motion, AnimatePresence } from "framer-motion";
import { useTerminalGooglePicker } from "@/app/hooks/terminal/useTerminalGooglePicker";

export default function TerminalFileLibrary({ onFilesSelect, selectedFiles = [], attachedFiles = [] }) {
  const [allFiles, setAllFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const [removingFileId, setRemovingFileId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const { getToken } = useAuth();
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const uploadMenuRef = useRef(null);

  // Get custom colors
  const customColors = useMemo(() => {
    if (typeof window !== "undefined") {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue("--custom-primary-color")?.trim() || "#6366f1";
      return { primary: primaryColor };
    }
    return { primary: "#6366f1" };
  }, []);

  // Helper function to get file icon based on type
  const getFileIcon = (type) => {
    const iconClass = "w-4 h-4";
    
    switch (type?.toLowerCase()) {
      case "pdf":
        return <FileText className={`${iconClass} text-red-600`} />;
      case "doc":
      case "docx":
        return <FileText className={`${iconClass} text-blue-600`} />;
      case "ppt":
      case "pptx":
        return <FileText className={`${iconClass} text-orange-600`} />;
      case "xls":
      case "xlsx":
        return <FileSpreadsheet className={`${iconClass} text-green-600`} />;
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
        return <FileImage className={`${iconClass} text-purple-600`} />;
      case "json":
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <FileCode className={`${iconClass} text-gray-600`} />;
      default:
        return <File className={`${iconClass} text-gray-600`} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format upload date
  const formatUploadDate = (dateString) => {
    if (!dateString) return "Recently";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? "Just now" : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Load all user files
  const loadAllFiles = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      setLoading(true);
      // Load ALL user files (null courseId means all files)
      const response = await getImportedFiles(token, null);
      
      console.log("[TerminalFileLibrary] API Response:", response);
      console.log("[TerminalFileLibrary] Files count:", response.files?.length || 0);

      if (response.files && Array.isArray(response.files)) {
        const files = response.files
          .map((file) => ({
            id: file._id || file.fileId,  // Use MongoDB _id for all files
            fileId: file.fileId,  // Google Drive ID (only for GDrive files)
            name: file.fileName,
            type: file.mimeType?.split("/")[1] || "unknown",
            size: file.size || 0,
            mimeType: file.mimeType,
            source: file.source || 'google_drive',  // Default to google_drive for backward compatibility
            uploadedAt: file.uploadedAt || file.createdAt || new Date().toISOString(),
          }))
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        console.log("[TerminalFileLibrary] Processed files:", files);
        setAllFiles(files);
        setFilteredFiles(files);
      } else {
        console.error("[TerminalFileLibrary] Unexpected files response:", response);
        setAllFiles([]);
        setFilteredFiles([]);
      }
    } catch (error) {
      console.error("[TerminalFileLibrary] Error loading files:", error);
      setAllFiles([]);
      setFilteredFiles([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Check Google Drive connection
  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch user data to check Google Drive connection status
        const userData = await fetchUserByClerkId(user.id);
        
        console.log("[TerminalFileLibrary] User data:", userData);
        console.log("[TerminalFileLibrary] Google Drive connected:", userData?.googleDrive?.connected);
        
        if (userData?.googleDrive?.connected) {
          setIsGoogleDriveConnected(true);
          loadAllFiles();
        } else {
          setIsGoogleDriveConnected(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("[TerminalFileLibrary] Error checking Google Drive connection:", error);
        
        // Handle specific errors (like invalid_grant)
        if (error.response?.status === 401 || error.message?.includes('authentication')) {
          setIsGoogleDriveConnected(false);
        }
        
        setLoading(false);
      }
    };

    checkGoogleDriveConnection();
  }, [user?.id, loadAllFiles]);

  // Update selected files from parent
  useEffect(() => {
    const newSelectedIds = new Set(selectedFiles.map(f => f.id));
    setSelectedFileIds(newSelectedIds);
  }, [selectedFiles]);

  // Filter files based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(allFiles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allFiles.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.type.toLowerCase().includes(query)
      );
      setFilteredFiles(filtered);
    }
  }, [searchQuery, allFiles]);

  // Handle file selection (just toggle selection, don't attach)
  const handleFileSelect = (file) => {
    const newSelectedIds = new Set(selectedFileIds);
    
    if (newSelectedIds.has(file.id)) {
      newSelectedIds.delete(file.id);
    } else {
      newSelectedIds.add(file.id);
    }
    
    setSelectedFileIds(newSelectedIds);
  };

  // Get attached file IDs
  const attachedFileIds = useMemo(() => {
    return new Set(attachedFiles.map(f => f.id || f.fileId));
  }, [attachedFiles]);

  // Select all files
  const handleSelectAll = () => {
    // Filter out attached files
    const selectableFiles = filteredFiles.filter(f => !attachedFileIds.has(f.id));
    
    if (selectedFileIds.size === selectableFiles.length) {
      // Deselect all
      setSelectedFileIds(new Set());
    } else {
      // Select all non-attached filtered files
      const allIds = new Set(selectableFiles.map(f => f.id));
      setSelectedFileIds(allIds);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedFileIds(new Set());
  };

  // Attach selected files
  const handleAttachSelected = () => {
    const selectedFilesList = allFiles.filter(f => selectedFileIds.has(f.id));
    if (selectedFilesList.length > 0) {
      onFilesSelect(selectedFilesList);
      // Clear selection after attaching
      setSelectedFileIds(new Set());
      showToast(`Attached ${selectedFilesList.length} file${selectedFilesList.length > 1 ? 's' : ''}`);
    }
  };

  // Toast function for notifications
  const showToast = useCallback((message) => {
    // Simple toast implementation - you can replace with your toast library
    console.log("Toast:", message);
  }, []);

  // Initialize Google Picker
  const { openPicker, isImporting } = useTerminalGooglePicker({
    onFilesImported: (importedFiles) => {
      // Refresh the file list after import
      loadAllFiles();
    },
    showToast: ({ title, description, variant }) => {
      showToast(`${title}: ${description}`);
    },
  });

  // Handle Google Drive import
  const handleGoogleDriveImport = useCallback(() => {
    setIsUploadMenuOpen(false);
    openPicker();
  }, [openPicker]);

  // Handle local file selection
  const handleLocalFileSelect = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const token = await getToken();
    if (!token) {
      showToast("Authentication required");
      return;
    }

    // Process each file
    for (const file of files) {
      // Check file size
      if (file.size > 52428800) { // 50MB
        showToast(`${file.name} exceeds 50MB limit`);
        continue;
      }

      // Show uploading state
      setUploadingFiles(prev => new Map(prev).set(file.name, 0));

      try {
        const response = await uploadTerminalFile(file, token);
        
        if (response.success) {
          showToast(`Uploaded ${file.name}`);
          // Refresh file list
          await loadAllFiles();
        }
      } catch (error) {
        console.error("Upload error:", error);
        showToast(`Failed to upload ${file.name}: ${error.message}`);
      } finally {
        // Remove from uploading state
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(file.name);
          return newMap;
        });
      }
    }

    // Clear file input
    event.target.value = '';
  }, [getToken, loadAllFiles, showToast]);

  // Handle file removal
  const handleRemoveFile = useCallback(async (fileId) => {
    if (!window.confirm("Are you sure you want to remove this file?")) {
      return;
    }

    try {
      setRemovingFileId(fileId);
      const token = await getToken();
      const response = await removeTerminalFile(fileId, token);
      
      if (response.success) {
        showToast("File removed");
        // Remove from local state
        setAllFiles(prev => prev.filter(f => f.id !== fileId));
        setFilteredFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error("Remove error:", error);
      showToast(`Failed to remove file: ${error.message}`);
    } finally {
      setRemovingFileId(null);
    }
  }, [getToken, showToast]);

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const mockEvent = {
        target: {
          files: e.dataTransfer.files
        }
      };
      handleLocalFileSelect(mockEvent);
    }
  }, [handleLocalFileSelect]);

  // Close upload menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        setIsUploadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isGoogleDriveConnected) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-8">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-3">Connect Google Drive to see your files</p>
          <a
            href="/dashboard/settings"
            className="text-sm font-medium hover:underline"
            style={{ color: customColors.primary }}
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full flex flex-col"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm border-2 border-dashed rounded-lg" style={{ borderColor: customColors.primary }}>
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: customColors.primary }} />
            <p className="text-lg font-medium" style={{ color: customColors.primary }}>Drop files to upload</p>
            <p className="text-sm text-gray-500 mt-1">Max 50MB per file</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-gray-100 flex-shrink-0"
        style={{ backgroundColor: `${customColors.primary}10` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" style={{ color: customColors.primary }} />
            <h2 className="text-lg font-semibold text-gray-900">File Library</h2>
            {allFiles.length > 0 && (
              <span className="text-sm text-gray-500">({allFiles.length} files)</span>
            )}
          </div>
          <button
            onClick={loadAllFiles}
            disabled={loading}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh files"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20"
            style={{ focusRingColor: customColors.primary }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selection Actions */}
        {selectedFileIds.size > 0 && (
          <div className="flex items-center justify-between mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-700">
              {selectedFileIds.size} file{selectedFileIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearSelection}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
              <button
                onClick={handleSelectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {selectedFileIds.size === filteredFiles.filter(f => !attachedFileIds.has(f.id)).length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleAttachSelected}
                className="px-3 py-1.5 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
                style={{ backgroundColor: customColors.primary }}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
                Attach Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: customColors.primary }} />
          </div>
        ) : filteredFiles.length > 0 || uploadingFiles.size > 0 ? (
          <div className="space-y-2">
            {/* Show uploading files */}
            {Array.from(uploadingFiles.entries()).map(([fileName, progress]) => (
              <div
                key={`uploading-${fileName}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-75"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{fileName}</p>
                    <p className="text-xs text-gray-500">Uploading...</p>
                  </div>
                </div>
              </div>
            ))}
            
            <AnimatePresence>
              {filteredFiles.map((file) => {
                const isSelected = selectedFileIds.has(file.id);
                const isAttached = attachedFiles.some(f => f.id === file.id || f.fileId === file.id);
                
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => !isAttached && handleFileSelect(file)}
                    className={`
                      flex items-center justify-between p-3 rounded-lg 
                      transition-all group
                      ${isAttached 
                        ? 'border border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed' 
                        : isSelected 
                          ? 'border-2 shadow-sm cursor-pointer' 
                          : 'border border-gray-200 hover:bg-gray-50 cursor-pointer'
                      }
                    `}
                    style={{
                      borderColor: !isAttached && isSelected ? customColors.primary : undefined,
                      backgroundColor: !isAttached && isSelected ? `${customColors.primary}08` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`
                        p-2 rounded-lg flex-shrink-0 transition-colors
                        ${isSelected ? 'bg-opacity-20' : 'bg-gray-100'}
                      `}
                      style={{
                        backgroundColor: isSelected ? `${customColors.primary}20` : undefined
                      }}
                      >
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          {file.source === 'google_drive' ? (
                            <Cloud className="w-3 h-3 text-gray-400" title="From Google Drive" />
                          ) : (
                            <HardDrive className="w-3 h-3 text-gray-400" title="Uploaded from computer" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{formatUploadDate(file.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {isAttached ? (
                        <>
                          <span className="text-xs text-gray-500">Attached</span>
                          <CheckCircle className="w-4 h-4 text-gray-400" />
                        </>
                      ) : isSelected ? (
                        <CheckCircle 
                          className="w-5 h-5 flex-shrink-0" 
                          style={{ color: customColors.primary }} 
                        />
                      ) : null}
                      
                      {/* Remove button - only show on hover and not for attached files */}
                      {!isAttached && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(file.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                          disabled={removingFileId === file.id}
                        >
                          {removingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No files found matching "{searchQuery}"</p>
              </>
            ) : (
              <>
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No files uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">Import files from Google Drive or upload from your computer</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0 relative">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.html,.css,.js,.jsx,.ts,.tsx,.json,.png,.jpg,.jpeg,.gif,.webp"
          className="hidden"
          onChange={handleLocalFileSelect}
        />
        
        {/* Upload menu */}
        <div className="relative">
          <button
            onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: customColors.primary }}
          >
            <Upload className="w-4 h-4" />
            <span>Import Files</span>
          </button>
          
          {/* Dropdown menu */}
          {isUploadMenuOpen && (
            <div 
              ref={uploadMenuRef}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={handleGoogleDriveImport}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                disabled={!isGoogleDriveConnected}
              >
                <Cloud className="w-5 h-5" style={{ color: customColors.primary }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Google Drive</p>
                  <p className="text-xs text-gray-500">
                    {isGoogleDriveConnected ? "Import from your Drive" : "Connect Google Drive first"}
                  </p>
                </div>
              </button>
              
              <div className="border-t border-gray-100" />
              
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsUploadMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <HardDrive className="w-5 h-5" style={{ color: customColors.primary }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">From Computer</p>
                  <p className="text-xs text-gray-500">Upload local files (max 50MB)</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}