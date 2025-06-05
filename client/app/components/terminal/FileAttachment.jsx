"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  FileText, 
  File, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileImage
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FileAttachment({ 
  file, 
  onRemove, 
  onPreview,
  customColors,
  processing = false,
  processed = false,
  error = null 
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Get appropriate icon based on file type
  const getFileIcon = () => {
    const iconClass = "w-4 h-4";
    const fileType = file.fileType || file.type || "";
    
    if (fileType.includes('pdf')) {
      return <FileText className={`${iconClass} text-red-600`} />;
    } else if (fileType.includes('doc') || fileType.includes('docx')) {
      return <FileText className={`${iconClass} text-blue-600`} />;
    } else if (fileType.includes('sheet') || fileType.includes('xls')) {
      return <FileSpreadsheet className={`${iconClass} text-green-600`} />;
    } else if (fileType.includes('presentation') || fileType.includes('ppt')) {
      return <FileText className={`${iconClass} text-orange-600`} />;
    } else if (fileType.includes('image')) {
      return <FileImage className={`${iconClass} text-purple-600`} />;
    } else if (fileType.includes('json') || fileType.includes('code')) {
      return <FileCode className={`${iconClass} text-gray-600`} />;
    }
    return <File className={`${iconClass} text-gray-600`} />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get status color
  const getStatusColor = () => {
    if (error) return 'border-red-300 bg-red-50';
    if (processed) return 'border-green-300 bg-green-50';
    if (processing) return 'border-blue-300 bg-blue-50';
    return 'border-gray-200 bg-white hover:border-gray-300';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
        getStatusColor()
      )}
    >
      {/* File Icon */}
      <div className="flex-shrink-0">
        {processing ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : error ? (
          <AlertCircle className="w-4 h-4 text-red-600" />
        ) : processed ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          getFileIcon()
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          error ? "text-red-900" : "text-gray-900"
        )}>
          {file.fileName || file.name}
        </p>
        {(file.fileSize || file.size) && !error && (
          <p className="text-xs text-gray-500">
            {formatFileSize(file.fileSize || file.size)}
            {processed && file.wordCount && ` • ${file.wordCount.toLocaleString()} words`}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-600 truncate">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {processed && onPreview && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Preview content"
          >
            <Eye className="w-3.5 h-3.5 text-gray-600" />
          </motion.button>
        )}
        
        {!processing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(file);
            }}
            className={cn(
              "p-1 rounded transition-all duration-200",
              isHovered ? "opacity-100" : "opacity-60",
              "hover:bg-gray-200"
            )}
            title="Remove file"
          >
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Processing indicator */}
      {processing && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 origin-left"
          style={{ borderRadius: '0 0 6px 6px' }}
        />
      )}
    </motion.div>
  );
}