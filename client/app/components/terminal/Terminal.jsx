"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal as TerminalIcon, 
  Loader2,
  Copy,
  Check,
  Zap,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import AutoExpandingInput from "./AutoExpandingInput";

export default function Terminal({ className, onMessage }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "system",
      content: "HomeBase Terminal v1.0.0\nClaude AI Assistant initialized.\n\nType 'help' for available commands or ask me anything.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const terminalRef = useRef(null);

  // Get custom colors from CSS variables - default values for SSR
  const [customColors, setCustomColors] = useState({ 
    primary: "#6366f1", 
    primaryDark: "#4c1d95", 
    textColor: "#ffffff" 
  });

  // Update colors on client side only
  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue("--custom-primary-color")?.trim() || "#6366f1";
    
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
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };
    
    setCustomColors({
      primary: primaryColor,
      primaryDark: adjustColor(primaryColor, -40),
      textColor: getTextColor(primaryColor)
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
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Notify parent component if callback provided
    if (onMessage) {
      onMessage(userMessage.content);
    }

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: `Processing: "${userMessage.content}"\n\nThis is a placeholder response. The terminal will soon be connected to the base agent for real AI assistance.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col", className)}>
      {/* Terminal Header */}
      <div 
        className="px-4 py-3"
        style={{ backgroundColor: customColors.primary }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" style={{ color: customColors.textColor }}>
            <TerminalIcon className="w-4 h-4" />
            <span className="text-sm font-mono">homebase-terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([{
                id: Date.now(),
                type: "system",
                content: "HomeBase Terminal v1.0.0\nClaude AI Assistant initialized.\n\nType 'help' for available commands or ask me anything.",
                timestamp: new Date()
              }])}
              className={cn(
                "text-xs font-mono px-2 py-1 rounded transition-all",
                customColors.textColor === "#ffffff" 
                  ? "text-white/70 hover:text-white hover:bg-white/10" 
                  : "text-black/70 hover:text-black hover:bg-black/10"
              )}
            >
              clear
            </button>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md",
              customColors.textColor === "#ffffff"
                ? "bg-white/20 text-white"
                : "bg-black/10 text-black"
            )}>
              <Zap className="w-3 h-3" />
              <span className="text-xs font-mono">connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        className="bg-gray-50 overflow-y-auto font-mono text-sm flex-1" 
        style={{ 
          minHeight: '200px' 
        }}
      >
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
                  <div className="flex items-start gap-2">
                    <span className="select-none" style={{ color: customColors.primary }}>
                      [{formatTimestamp(message.timestamp)}]
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-700 flex-1">{message.content}</span>
                  </div>
                )}
                {message.type === "system" && (
                  <div className="text-gray-500 whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
                {message.type === "assistant" && (
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-0 bottom-0 w-px" style={{ backgroundColor: `${customColors.primary}30` }} />
                    <div className="flex items-start justify-between gap-2">
                      <pre className="text-gray-700 whitespace-pre-wrap flex-1">
                        {message.content}
                      </pre>
                      <button
                        onClick={() => handleCopy(message.content, message.id)}
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
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: customColors.primary }} />
              <span className="animate-pulse">Processing...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Terminal Input - Auto-expanding */}
      <AutoExpandingInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        customColors={customColors}
        className="border-t border-gray-200"
      />
    </div>
  );
}