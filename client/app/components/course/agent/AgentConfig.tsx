"use client";

import React from "react";

interface AgentConfigProps {
  agentType: string;
  config: any;
  onChange: (config: any) => void;
  courseColors: { primary: string; secondary: string };
  isDisabled?: boolean;
}

export default function AgentConfig({
  agentType,
  config,
  onChange,
  courseColors,
  isDisabled,
}: AgentConfigProps) {
  // Component logging
  React.useEffect(() => {
    console.log("[AgentConfig] Component mounted", {
      agentType,
      config,
      isDisabled,
    });
    return () => console.log("[AgentConfig] Component unmounted");
  }, []);

  React.useEffect(() => {
    console.log("[AgentConfig] Agent type changed", { agentType });
  }, [agentType]);

  const updateConfig = (key: string, value: any) => {
    console.log("[AgentConfig] Config updated", {
      key,
      value,
      previousValue: config[key],
    });
    onChange({
      ...config,
      [key]: value,
    });
  };

  const renderConfigOptions = () => {
    switch (agentType) {
      case "note-taker":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Output Style
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    value: "bullet",
                    label: "Bullet Points",
                    description: "Concise key points",
                  },
                  {
                    value: "outline",
                    label: "Outline",
                    description: "Structured hierarchy",
                  },
                  {
                    value: "paragraph",
                    label: "Paragraph",
                    description: "Narrative format",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        config.noteStyle === option.value
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }
                      ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <input
                      type="radio"
                      name="noteStyle"
                      value={option.value}
                      checked={config.noteStyle === option.value}
                      onChange={(e) =>
                        updateConfig("noteStyle", e.target.value)
                      }
                      disabled={isDisabled}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">
                Additional Options
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeFormulas !== false}
                  onChange={(e) =>
                    updateConfig("includeFormulas", e.target.checked)
                  }
                  disabled={isDisabled}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">
                  Include mathematical formulas
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeDiagramReferences !== false}
                  onChange={(e) =>
                    updateConfig("includeDiagramReferences", e.target.checked)
                  }
                  disabled={isDisabled}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">
                  Reference diagrams and figures
                </span>
              </label>
            </div>
          </div>
        );

      case "researcher":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Research Depth
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    value: "surface",
                    label: "Quick Overview",
                    description: "Key facts only",
                  },
                  {
                    value: "moderate",
                    label: "Standard Analysis",
                    description: "Balanced depth",
                  },
                  {
                    value: "deep",
                    label: "Deep Dive",
                    description: "Comprehensive analysis",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        (config.researchDepth || "moderate") === option.value
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }
                      ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <input
                      type="radio"
                      name="researchDepth"
                      value={option.value}
                      checked={
                        (config.researchDepth || "moderate") === option.value
                      }
                      onChange={(e) =>
                        updateConfig("researchDepth", e.target.value)
                      }
                      disabled={isDisabled}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">
                Research Options
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeWebSearch !== false}
                  onChange={(e) =>
                    updateConfig("includeWebSearch", e.target.checked)
                  }
                  disabled={isDisabled}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">
                  Search internet for current information
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeCitations !== false}
                  onChange={(e) =>
                    updateConfig("includeCitations", e.target.checked)
                  }
                  disabled={isDisabled}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">
                  Extract and include citations
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.compareSources || false}
                  onChange={(e) =>
                    updateConfig("compareSources", e.target.checked)
                  }
                  disabled={isDisabled}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">
                  Compare multiple sources
                </span>
              </label>
            </div>
          </div>
        );

      case "study-buddy":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Study Material Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    value: "flashcards",
                    label: "Flashcards",
                    description: "Q&A format",
                  },
                  {
                    value: "quiz",
                    label: "Practice Quiz",
                    description: "Test knowledge",
                  },
                  {
                    value: "guide",
                    label: "Study Guide",
                    description: "Comprehensive review",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        config.studyMode === option.value
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }
                      ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <input
                      type="radio"
                      name="studyMode"
                      value={option.value}
                      checked={config.studyMode === option.value}
                      onChange={(e) =>
                        updateConfig("studyMode", e.target.value)
                      }
                      disabled={isDisabled}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Difficulty Level
              </label>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Basic</span>
                <span>Expert</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={config.difficulty || 3}
                onChange={(e) =>
                  updateConfig("difficulty", parseInt(e.target.value))
                }
                disabled={isDisabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center mt-1">
                <span className="text-sm font-medium text-gray-700">
                  {
                    ["Basic", "Easy", "Medium", "Hard", "Expert"][
                      config.difficulty - 1 || 2
                    ]
                  }
                </span>
              </div>
            </div>
          </div>
        );

      case "assignment":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Assignment Type
              </label>
              <select
                value={config.assignmentType || "essay"}
                onChange={(e) => updateConfig("assignmentType", e.target.value)}
                disabled={isDisabled}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="essay">Essay</option>
                <option value="report">Research Report</option>
                <option value="analysis">Analysis Paper</option>
                <option value="presentation">Presentation</option>
                <option value="proposal">Project Proposal</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Word Count
                </label>
                <input
                  type="number"
                  value={config.wordCount || 1000}
                  onChange={(e) =>
                    updateConfig("wordCount", parseInt(e.target.value))
                  }
                  disabled={isDisabled}
                  placeholder="1000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Citation Style
                </label>
                <select
                  value={config.citationStyle || "apa"}
                  onChange={(e) =>
                    updateConfig("citationStyle", e.target.value)
                  }
                  disabled={isDisabled}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="apa">APA</option>
                  <option value="mla">MLA</option>
                  <option value="chicago">Chicago</option>
                  <option value="harvard">Harvard</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="w-full">{renderConfigOptions()}</div>;
}
