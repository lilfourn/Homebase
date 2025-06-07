"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
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
    const getWelcomeMessage = () => ({
      id: Date.now(),
      type: "system",
      content:
        "HomeBase Terminal v1.0.0\nYour intelligent coding assistant is ready.\n\nType 'help' for available commands or ask me anything.",
      timestamp: new Date(),
      isWelcome: true,
    });

    const [messages, setMessages] = useState([getWelcomeMessage()]);
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

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        getAttachedFiles: () => attachedFiles,
        attachFiles: async (filesToAttach) => {
          if (!filesToAttach || filesToAttach.length === 0) return [];
          const currentFileIds = new Set(attachedFiles.map((f) => f.id));
          const uniqueFilesToAttach = filesToAttach.filter(
            (file) => !currentFileIds.has(file.id)
          );

          if (uniqueFilesToAttach.length === 0) return attachedFiles;

          const newFiles = uniqueFilesToAttach.map((file) => ({
            id: file.id,
            fileId: file.fileId || file.id,
            fileName: file.name,
            mimeType: file.mimeType,
            source: file.source || "google_drive",
            // We no longer pre-process, so these flags are simplified
            processed: true,
            processing: false,
            error: null,
          }));

          setAttachedFiles((prev) => [...prev, ...newFiles]);
          return [...attachedFiles, ...newFiles];
        },
      }),
      [attachedFiles, setAttachedFiles]
    );

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
        attachedFiles: attachedFiles,
      };

      setMessages((prev) => {
        const otherMessages = prev.filter((m) => !m.isWelcome);
        return [...otherMessages, userMessage];
      });
      setInput("");
      setAttachedFiles([]);
      setIsLoading(true);

      // Notify parent component if callback provided
      if (onMessage) {
        onMessage(userMessage.content, userMessage.attachedFiles);
      }

      try {
        // Get auth token
        const token = await getToken();

        // --- START: New logic for handling image data ---
        let imageData = null;
        const imageFile = userMessage.attachedFiles.find((file) =>
          file.mimeType?.startsWith("image/")
        );

        if (imageFile) {
          try {
            // Import the new API function
            const { getTerminalFile } = await import(
              "@/app/api/fileProcessing.api"
            );
            // Fetch the full file data, including base64 content
            const response = await getTerminalFile(imageFile.id, token);
            if (response.success && response.file.base64Content) {
              imageData = {
                base64: response.file.base64Content,
                mimeType: response.file.mimeType,
              };
            }
          } catch (imgError) {
            console.error("Error fetching image data for vision:", imgError);
          }
        }
        // --- END: New logic for handling image data ---

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
            imageData, // Pass the image data to the backend
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
      });
    };

    return (
      <div
        className={cn(
          "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full",
          className
        )}
      >
        {/* Terminal Header */}
        <div className="px-4 py-3 flex-shrink-0 bg-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <TerminalIcon className="w-4 h-4" />
              <span className="text-sm font-mono">homebase-terminal</span>
              {threadId && (
                <span className="text-xs font-mono opacity-60">
                  [thread active]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMessages([getWelcomeMessage()]);
                  if (onClear) {
                    onClear();
                  }
                }}
                className="text-xs font-mono px-2 py-1 rounded transition-all text-slate-400 hover:text-white hover:bg-white/10"
              >
                clear
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 text-green-400">
                <Zap className="w-3 h-3" />
                <span className="text-xs font-mono">connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="bg-white overflow-y-auto font-mono text-sm flex-1 min-h-0">
          <div className="p-4 space-y-4">
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
                    <div className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 flex-shrink-0 rounded-full mt-0.5"
                        style={{
                          background: `linear-gradient(135deg, var(--custom-primary-color, #F97316) 0%, var(--custom-hover-primary-color, #EA580C) 100%)`,
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-sans font-bold text-slate-800">
                            You
                          </span>
                          <span className="font-sans text-xs text-slate-400">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="font-sans text-slate-600 leading-relaxed mt-0.5">
                          {message.content}
                        </p>
                        {message.attachedFiles &&
                          message.attachedFiles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-gray-50 text-gray-700 border border-gray-200"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{file.fileName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                  {message.type === "system" && (
                    <div className="text-slate-500 whitespace-pre-wrap font-sans text-center text-xs py-2">
                      {message.content}
                    </div>
                  )}
                  {message.type === "assistant" && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 flex-shrink-0 bg-slate-800 rounded-full flex items-center justify-center mt-0.5">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-sans font-bold text-slate-800">
                            AI Assistant
                          </span>
                        </div>
                        <div className="relative">
                          <div
                            className="absolute left-0 top-0 bottom-0 w-px"
                            style={{
                              backgroundColor:
                                "var(--custom-primary-color, #F97316)",
                              opacity: 0.2,
                            }}
                          />
                          <pre className="font-sans text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">
                            {message.content}
                          </pre>
                          <button
                            onClick={() =>
                              handleCopy(message.content, message.id)
                            }
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
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
                className="flex items-center gap-2 text-slate-500"
              >
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "var(--custom-primary-color, #F97316)" }}
                />
                <span className="animate-pulse">Processing...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Attached Files Bar & Input */}
        <div className="border-t border-gray-100 flex-shrink-0 bg-white p-4">
          <AttachedFilesBar
            attachedFiles={attachedFiles}
            setAttachedFiles={setAttachedFiles}
            selectedGoogleDriveFiles={selectedFiles}
            courseFiles={courseFiles}
            onFileSelect={onFileSelect}
            onFileRemove={() => {
              if (onFileSelect) {
                onFileSelect();
              }
            }}
            className={attachedFiles.length > 0 ? "mb-3" : ""}
          />
          <AutoExpandingInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasAttachments={attachedFiles.length > 0}
          />
        </div>
      </div>
    );
  }
);

Terminal.displayName = "Terminal";

export default Terminal;
