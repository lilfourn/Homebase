"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Paperclip,
  Terminal as TerminalIcon,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AttachedFilesBar from "./AttachedFilesBar";
import AutoExpandingInput from "./AutoExpandingInput";

import { useAuth } from "@clerk/nextjs";
import { forwardRef, useImperativeHandle } from "react";

const Terminal = forwardRef(
  (
    {
      className,
      onMessage,
      selectedFiles = [],
      courseFiles = [],
      onFileSelect,
      attachedFiles = [],
      onAttachedFilesChange,
      temperature = 0.7,
      responseStyle = "normal",
      threadId,
      onClear,
    },
    ref
  ) => {
    const [messages, setMessages] = useState([
      {
        id: 1,
        type: "system",
        content:
          "HomeBase Terminal v1.0.0\nClaude AI Assistant initialized.\n\nType 'help' for available commands or ask me anything.",
        timestamp: new Date(),
      },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const messagesEndRef = useRef(null);
    const { getToken } = useAuth();

    // Update attached files through parent callback
    const setAttachedFiles = (newFiles) => {
      if (onAttachedFilesChange) {
        if (typeof newFiles === "function") {
          onAttachedFilesChange((prev) => newFiles(prev));
        } else {
          onAttachedFilesChange(newFiles);
        }
      }
    };

    // Get custom colors from CSS variables - default values for SSR
    const [customColors, setCustomColors] = useState({
      primary: "#6366f1",
      primaryDark: "#4c1d95",
      textColor: "#ffffff",
    });

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        getAttachedFiles: () => attachedFiles,
        attachFiles: async (filesToAttach) => {
          // Process and attach files from the file list
          if (!filesToAttach || filesToAttach.length === 0) return [];

          // Get current attached file IDs for duplicate checking
          const currentFileIds = new Set(attachedFiles.map((f) => f.id));

          // Filter out files that are already attached
          const uniqueFilesToAttach = filesToAttach.filter(
            (file) => !currentFileIds.has(file.id)
          );

          if (uniqueFilesToAttach.length === 0) return attachedFiles;

          // Convert selected files to the format expected by AttachedFilesBar
          const newFiles = uniqueFilesToAttach.map((file) => ({
            id: file.id,
            fileId: file.fileId || file.id, // Use fileId for Google Drive, id for local
            fileName: file.name,
            name: file.name,
            type: file.type,
            size: file.size,
            mimeType: file.mimeType,
            source: file.source || "google_drive", // IMPORTANT: Include source field
            uploadedAt: file.uploadedAt,
            processing: true, // Will be processed when added
          }));

          // Add files with processing state
          const initialFiles = [...attachedFiles, ...newFiles];
          setAttachedFiles(initialFiles);

          // Process each file
          const token = await getToken();
          let googleDriveAuthError = false;
          const results = [];

          // Process all files and collect results
          for (const file of newFiles) {
            try {
              let result;

              console.log(`[Terminal] Processing file: ${file.fileName}`, {
                id: file.id,
                fileId: file.fileId,
                source: file.source,
                mimeType: file.mimeType,
              });

              // Check file source to determine processing method
              if (file.source === "local_upload") {
                // For local files, get content from our backend
                const { getTerminalFileContent } = await import(
                  "@/app/api/fileProcessing.api"
                );
                const response = await getTerminalFileContent(file.id, token);

                // Format response to match Google Drive structure
                result = {
                  success: response.success,
                  file: response.file,
                  content: response.file.content,
                  fileName: response.file.fileName,
                  mimeType: response.file.mimeType,
                  size: response.file.size,
                  metadata: {
                    source: "local_upload",
                    uploadedAt: response.file.uploadedAt,
                  },
                  wordCount: response.file.wordCount,
                  preview: response.file.preview,
                };
              } else {
                // For Google Drive files, use existing method
                const { processGoogleDriveFile } = await import(
                  "@/app/api/fileProcessing.api"
                );
                result = await processGoogleDriveFile(
                  file.fileId,
                  file.fileName,
                  token
                );
              }

              results.push({
                fileId: file.id,
                success: true,
                data: result,
              });
            } catch (error) {
              console.error("Error processing file:", error);

              // Check if this is a Google Drive authentication error
              if (error.isGoogleDriveAuthError) {
                googleDriveAuthError = true;

                // Show system message about Google Drive authentication issue
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: "system",
                    content:
                      "⚠️ Google Drive authentication failed. Please reconnect your Google Drive account in Settings.",
                    timestamp: new Date(),
                  },
                ]);
              }

              results.push({
                fileId: file.id,
                success: false,
                error: error.error || error.message || "Failed to process file",
              });
            }
          }

          // Batch update all files at once
          const finalFiles = initialFiles.map((f) => {
            const result = results.find((r) => r.fileId === f.id);
            if (!result) return f; // Not a file we just processed

            if (result.success) {
              return {
                ...f,
                ...result.data,
                processing: false,
                processed: true,
                error: null,
              };
            } else {
              return {
                ...f,
                processing: false,
                processed: false,
                error: result.error,
              };
            }
          });

          // Update all files at once
          setAttachedFiles(finalFiles);

          // Return updated array
          return googleDriveAuthError ? { authError: true } : attachedFiles;
        },
      }),
      [attachedFiles, getToken, setMessages]
    );

    // Update colors on client side only
    useEffect(() => {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor =
        computedStyle.getPropertyValue("--custom-primary-color")?.trim() ||
        "#6366f1";

      // Calculate if text should be white or black based on background
      const getTextColor = (hexColor) => {
        // Convert hex to RGB
        const r = parseInt(hexColor.substring(1, 3), 16);
        const g = parseInt(hexColor.substring(3, 5), 16);
        const b = parseInt(hexColor.substring(5, 7), 16);

        // Calculate brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Return white for dark backgrounds, black for light
        return brightness > 128 ? "#000000" : "#ffffff";
      };

      // Generate darker shade
      const adjustColor = (color, amount) => {
        const num = parseInt(color.replace("#", ""), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
      };

      setCustomColors({
        primary: primaryColor,
        primaryDark: adjustColor(primaryColor, -40),
        textColor: getTextColor(primaryColor),
      });
    }, []);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const handleCopy = async (content, messageId) => {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage = {
        id: Date.now(),
        type: "user",
        content: input.trim(),
        timestamp: new Date(),
        attachedFiles: attachedFiles.filter((f) => f.processed), // Only include processed files
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      // Clear attached files after sending
      setAttachedFiles([]);

      // Notify parent component if callback provided
      if (onMessage) {
        onMessage(userMessage.content, userMessage.attachedFiles);
      }

      try {
        // Get auth token
        const token = await getToken();

        // Import terminal API
        const { processTerminalMessage } = await import(
          "@/app/api/terminal.api"
        );

        // Process message with AI and conversation thread
        const response = await processTerminalMessage(
          userMessage.content,
          userMessage.attachedFiles,
          {
            temperature: temperature,
            model: "claude-3-5-sonnet-latest",
            responseStyle: responseStyle,
            threadId: threadId,
          },
          token
        );

        // Add AI response
        const aiMessage = {
          id: Date.now() + 1,
          type: "assistant",
          content:
            response.content ||
            "I apologize, but I couldn't process your request. Please try again.",
          timestamp: new Date(),
          metadata: response.metadata,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error("Error processing terminal message:", error);

        // Add error message
        const errorMessage = {
          id: Date.now() + 1,
          type: "system",
          content: `⚠️ Error: ${
            error.message || "Failed to process your request. Please try again."
          }`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    const formatTimestamp = (timestamp) => {
      return timestamp.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
    };

    return (
      <div
        className={cn(
          "bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full",
          className
        )}
      >
        {/* Terminal Header */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: customColors.primary }}
        >
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2"
              style={{ color: customColors.textColor }}
            >
              <TerminalIcon className="w-4 h-4" />
              <span className="text-sm font-mono">homebase-terminal</span>
              {threadId && (
                <span className="text-xs font-mono opacity-70">
                  [thread active]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: Date.now(),
                      type: "system",
                      content:
                        "HomeBase Terminal v1.0.0\nClaude AI Assistant initialized.\n\nType 'help' for available commands or ask me anything.",
                      timestamp: new Date(),
                    },
                  ]);
                  if (onClear) {
                    onClear();
                  }
                }}
                className={cn(
                  "text-xs font-mono px-2 py-1 rounded transition-all",
                  customColors.textColor === "#ffffff"
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-black/70 hover:text-black hover:bg-black/10"
                )}
              >
                clear
              </button>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md",
                  customColors.textColor === "#ffffff"
                    ? "bg-white/20 text-white"
                    : "bg-black/10 text-black"
                )}
              >
                <Zap className="w-3 h-3" />
                <span className="text-xs font-mono">connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="bg-gray-50 overflow-y-auto font-mono text-sm flex-1 min-h-0">
          <div className="p-4 space-y-2">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group"
                >
                  {message.type === "user" && (
                    <div>
                      <div className="flex items-start gap-2">
                        <span
                          className="select-none"
                          style={{ color: customColors.primary }}
                        >
                          [{formatTimestamp(message.timestamp)}]
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-700 flex-1">
                          {message.content}
                        </span>
                      </div>
                      {message.attachedFiles &&
                        message.attachedFiles.length > 0 && (
                          <div className="ml-6 mt-1 flex flex-wrap gap-1">
                            {message.attachedFiles.map((file, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                              >
                                <Paperclip className="w-3 h-3" />
                                {file.fileName}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                  {message.type === "system" && (
                    <div className="text-gray-500 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}
                  {message.type === "assistant" && (
                    <div className="relative pl-6">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-px"
                        style={{ backgroundColor: `${customColors.primary}30` }}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <pre className="text-gray-700 whitespace-pre-wrap flex-1">
                          {message.content}
                        </pre>
                        <button
                          onClick={() =>
                            handleCopy(message.content, message.id)
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-200 rounded"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-gray-500"
              >
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: customColors.primary }}
                />
                <span className="animate-pulse">Processing...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Attached Files Bar */}
        <div className="border-t border-gray-200 flex-shrink-0">
          <AttachedFilesBar
            attachedFiles={attachedFiles}
            setAttachedFiles={setAttachedFiles}
            selectedGoogleDriveFiles={selectedFiles}
            courseFiles={courseFiles}
            onFileSelect={onFileSelect}
            onFileRemove={() => {
              // Notify parent about file removal
              if (onFileSelect) {
                onFileSelect();
              }
            }}
            customColors={customColors}
            className="px-4 pt-3"
          />

          {/* Terminal Input - Auto-expanding */}
          <AutoExpandingInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            customColors={customColors}
            hasAttachments={attachedFiles.length > 0}
          />
        </div>
      </div>
    );
  }
);

Terminal.displayName = "Terminal";

export default Terminal;
