"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Copy, Check, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function FilePreviewDialog({ 
  file, 
  isOpen, 
  onClose, 
  customColors 
}) {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content || file.preview || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([file.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.fileName || "file"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] max-w-4xl mx-auto bg-white rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div 
              className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
              style={{ backgroundColor: `${customColors.primary}10` }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" style={{ color: customColors.primary }} />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {file.fileName || file.name}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    {file.fileType && (
                      <span className="capitalize">{file.fileType}</span>
                    )}
                    {file.wordCount && (
                      <span>{file.wordCount.toLocaleString()} words</span>
                    )}
                    {file.fileSize && (
                      <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy content"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                {/* Download button */}
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Download as text"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </button>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Metadata */}
              {file.metadata && Object.keys(file.metadata).length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">File Information</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {Object.entries(file.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structure preview if available */}
              {file.structure && Object.keys(file.structure).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Document Structure</h3>
                  
                  {/* Headings */}
                  {file.structure.headings && file.structure.headings.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-600 mb-1">Headings</h4>
                      <div className="space-y-1">
                        {file.structure.headings.map((heading, index) => (
                          <div 
                            key={index} 
                            className="text-sm text-gray-700"
                            style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
                          >
                            {heading.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main content */}
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  {file.content || file.preview || "No content available"}
                </pre>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}