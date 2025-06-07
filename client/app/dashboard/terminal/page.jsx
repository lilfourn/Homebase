"use client";

import Terminal from "@/app/components/terminal/Terminal";
import TerminalFileLibrary from "@/app/components/terminal/TerminalFileLibrary";
import { useSchoolUpdate } from "@/app/context/SchoolUpdateContext";
import { motion } from "framer-motion";
import { Bot, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function TerminalPage() {
  const [commandHistory, setCommandHistory] = useState([]);
  const [temperature, setTemperature] = useState(0.7);
  const [responseStyle, setResponseStyle] = useState("normal");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileLibraryKey, setFileLibraryKey] = useState(0); // Force refresh key
  const [threadId, setThreadId] = useState(null);
  const terminalRef = useRef(null);
  const fileLibraryRef = useRef(null);
  const { updateCount } = useSchoolUpdate(); // To re-trigger effects on theme change

  useEffect(() => {
    // Initialize threadId on component mount
    if (!threadId) {
      setThreadId(uuidv4());
    }
  }, []);

  // Function to start a new conversation thread
  const startNewThread = () => {
    setThreadId(uuidv4());
  };

  // Handler for attaching files from the file library
  const handleAttachFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Process files through terminal component
    if (terminalRef.current) {
      const result = await terminalRef.current.attachFiles(files);

      // Check if there was an authentication error
      if (result && result.authError) {
        if (
          window.confirm(
            "Google Drive authentication has expired. Would you like to reconnect your Google Drive account in Settings?"
          )
        ) {
          window.location.href = "/dashboard/settings";
          return;
        }
      }
    }
  };

  // Handler for when files are removed from terminal
  const handleFilesDetached = () => {
    // Force refresh the file library by incrementing the key
    setFileLibraryKey((prev) => prev + 1);
  };

  // Handler for refreshing file library
  const refreshFileLibrary = () => {
    setFileLibraryKey((prev) => prev + 1);
  };

  const handleTerminalMessage = (message, attachedFiles) => {
    // If the user clears the terminal, start a new thread
    if (typeof message === "string" && message.toLowerCase() === "clear") {
      startNewThread();
    }
    setCommandHistory((prev) => [...prev.slice(-4), message]);
    // TODO: Process attached files with message
    if (attachedFiles && attachedFiles.length > 0) {
      console.log("Message with attached files:", { message, attachedFiles });
    }
  };

  return (
    <>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--custom-primary-color, #f97316);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--custom-primary-color, #f97316);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
          border: none;
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .btn-primary {
          background-color: var(--custom-primary-color) !important;
          color: var(--custom-primary-text-color) !important;
        }
        .btn-primary:hover {
          background-color: var(--custom-hover-primary-color) !important;
        }
        .text-primary {
          color: var(--custom-primary-color) !important;
        }
        .border-primary {
          border-color: var(--custom-primary-color) !important;
        }
      `}</style>
      <div className="flex flex-col gap-4 h-full">
        {/* Header Section */}
        <div className="rounded-2xl px-6 py-4 shadow-md btn-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  AI Terminal
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--custom-primary-text-color)",
                    opacity: 0.8,
                  }}
                >
                  Your intelligent coding assistant
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
          {/* Terminal Component */}
          <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0"
            >
              <Terminal
                ref={terminalRef}
                onMessage={handleTerminalMessage}
                onFileSelect={handleFilesDetached}
                attachedFiles={attachedFiles}
                onAttachedFilesChange={setAttachedFiles}
                temperature={temperature}
                responseStyle={responseStyle}
                threadId={threadId}
                onClear={startNewThread}
                className="flex-1 min-h-0"
              />
            </motion.div>

            {/* Multi-line Hint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4 hidden lg:flex items-center justify-between w-full"
            >
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-wider text-primary"
                  style={{ color: "var(--custom-primary-color)" }}
                >
                  MULTI-LINE
                </h3>
                <p className="text-sm text-gray-600">
                  Shift+Enter for new lines
                </p>
              </div>
              <div
                className="w-1 h-8 rounded-full"
                style={{
                  backgroundColor: "var(--custom-primary-color, #F97316)",
                  opacity: 0.2,
                }}
              />
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0"
            >
              <TerminalFileLibrary
                key={fileLibraryKey}
                ref={fileLibraryRef}
                onFilesSelect={handleAttachFiles}
                attachedFiles={attachedFiles}
                onRefresh={refreshFileLibrary}
              />
            </motion.div>

            {/* Terminal Config */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0"
            >
              <div
                className="px-4 py-3 border-b border-gray-100"
                style={{
                  backgroundColor:
                    "rgba(var(--custom-primary-rgb, 249, 115, 22), 0.05)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary opacity-50" />
                  <h2 className="text-lg font-semibold text-gray-900/50">
                    Terminal Config
                  </h2>
                </div>
              </div>
              <div className="p-4 space-y-6 flex-1 flex flex-col overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800">
                      AI Creativity
                    </label>
                    <div
                      className="text-sm font-mono px-2.5 py-1.5 rounded-lg"
                      style={{
                        backgroundColor:
                          "rgba(var(--custom-primary-rgb, 249, 115, 22), 0.1)",
                      }}
                    >
                      <span style={{ color: "var(--custom-primary-color)" }}>
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) =>
                        setTemperature(parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #e5e7eb 0%, var(--custom-primary-color, #F97316) ${
                          temperature * 100
                        }%, #e5e7eb ${temperature * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Focused</span>
                      <span className="hidden sm:inline">Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <label className="text-sm font-bold text-gray-800">
                    Response Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: "normal", label: "Normal", icon: "💬" },
                      { value: "concise", label: "Concise", icon: "📝" },
                      { value: "verbose", label: "Verbose", icon: "📚" },
                      { value: "casual", label: "Casual", icon: "😊" },
                      { value: "academic", label: "Academic", icon: "🎓" },
                      { value: "tutor", label: "Tutor", icon: "👨‍🏫" },
                      { value: "engineer", label: "Engineer", icon: "⚙️" },
                    ].map((style) => (
                      <button
                        key={style.value}
                        onClick={() => setResponseStyle(style.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                          responseStyle === style.value
                            ? "border-primary shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        style={
                          responseStyle === style.value
                            ? {
                                backgroundColor:
                                  "rgba(var(--custom-primary-rgb, 249, 115, 22), 0.08)",
                              }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{style.icon}</span>
                          <span
                            className={`text-sm font-semibold ${
                              responseStyle === style.value
                                ? "text-gray-900"
                                : "text-gray-700"
                            }`}
                          >
                            {style.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
