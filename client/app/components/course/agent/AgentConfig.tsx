"use client";

import React from 'react';
import { Sparkles, Brain, Globe } from 'lucide-react';

interface AgentConfigProps {
  agentType: string;
  config: any;
  onChange: (config: any) => void;
  courseColors: { primary: string; secondary: string };
  isDisabled?: boolean;
}

export default function AgentConfig({ agentType, config, onChange, courseColors, isDisabled }: AgentConfigProps) {
  // Component logging
  React.useEffect(() => {
    console.log('[AgentConfig] Component mounted', { agentType, config, isDisabled });
    return () => console.log('[AgentConfig] Component unmounted');
  }, []);

  React.useEffect(() => {
    console.log('[AgentConfig] Agent type changed', { agentType });
  }, [agentType]);

  const updateConfig = (key: string, value: any) => {
    console.log('[AgentConfig] Config updated', { key, value, previousValue: config[key] });
    onChange({
      ...config,
      [key]: value
    });
  };

  const renderConfigOptions = () => {
    switch (agentType) {
      case 'note-taker':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Note Style</label>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="noteStyle"
                    value="bullet"
                    checked={config.noteStyle === 'bullet'}
                    onChange={(e) => updateConfig('noteStyle', e.target.value)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Bullet Points</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="noteStyle"
                    value="outline"
                    checked={config.noteStyle === 'outline'}
                    onChange={(e) => updateConfig('noteStyle', e.target.value)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Structured Outline</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="noteStyle"
                    value="summary"
                    checked={config.noteStyle === 'summary'}
                    onChange={(e) => updateConfig('noteStyle', e.target.value)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Paragraph Summary</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'researcher':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Research Depth</label>
              <select
                value={config.depth || 'moderate'}
                onChange={(e) => updateConfig('depth', e.target.value)}
                disabled={isDisabled}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: courseColors.primary + '40',
                  focusBorderColor: courseColors.primary 
                }}
              >
                <option value="quick">Quick Overview</option>
                <option value="moderate">Moderate Analysis</option>
                <option value="deep">Deep Research</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Focus Areas</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeSources || false}
                    onChange={(e) => updateConfig('includeSources', e.target.checked)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Include Sources</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.comparativeAnalysis || false}
                    onChange={(e) => updateConfig('comparativeAnalysis', e.target.checked)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Comparative Analysis</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'study-buddy':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Study Mode</label>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="studyMode"
                    value="flashcards"
                    checked={config.studyMode === 'flashcards'}
                    onChange={(e) => updateConfig('studyMode', e.target.value)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Flashcards</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="studyMode"
                    value="quiz"
                    checked={config.studyMode === 'quiz'}
                    onChange={(e) => updateConfig('studyMode', e.target.value)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Practice Quiz</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="studyMode"
                    value="guide"
                    checked={config.studyMode === 'guide'}
                    onChange={(e) => updateConfig('studyMode', e.target.value)}
                    disabled={isDisabled}
                    className="accent-current"
                    style={{ accentColor: courseColors.primary }}
                  />
                  <span className="text-sm">Study Guide</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty Level</label>
              <input
                type="range"
                min="1"
                max="5"
                value={config.difficulty || 3}
                onChange={(e) => updateConfig('difficulty', parseInt(e.target.value))}
                disabled={isDisabled}
                className="w-full accent-current"
                style={{ accentColor: courseColors.primary }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Easy</span>
                <span>Hard</span>
              </div>
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Assignment Type</label>
              <select
                value={config.assignmentType || 'essay'}
                onChange={(e) => updateConfig('assignmentType', e.target.value)}
                disabled={isDisabled}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: courseColors.primary + '40',
                  focusBorderColor: courseColors.primary 
                }}
              >
                <option value="essay">Essay</option>
                <option value="report">Report</option>
                <option value="analysis">Analysis</option>
                <option value="presentation">Presentation</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Word Count Target</label>
              <input
                type="number"
                value={config.wordCount || 1000}
                onChange={(e) => updateConfig('wordCount', parseInt(e.target.value))}
                disabled={isDisabled}
                placeholder="1000"
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  borderColor: courseColors.primary + '40',
                  focusBorderColor: courseColors.primary 
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700">Agent Config</h4>
      
      {/* Common configuration options */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Processing Mode</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateConfig('mode', 'deep-think')}
              disabled={isDisabled}
              className={`
                px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                ${config.mode === 'deep-think' ? 'text-white' : 'text-gray-700 bg-gray-100'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
              `}
              style={{
                backgroundColor: config.mode === 'deep-think' ? courseColors.primary : undefined
              }}
            >
              <Brain className="w-3 h-3 inline mr-1" />
              Deep Think
            </button>
            <button
              onClick={() => updateConfig('mode', 'standard')}
              disabled={isDisabled}
              className={`
                px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                ${config.mode === 'standard' ? 'text-white' : 'text-gray-700 bg-gray-100'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
              `}
              style={{
                backgroundColor: config.mode === 'standard' ? courseColors.primary : undefined
              }}
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              Standard
            </button>
            <button
              onClick={() => updateConfig('mode', 'internet')}
              disabled={isDisabled}
              className={`
                px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                ${config.mode === 'internet' ? 'text-white' : 'text-gray-700 bg-gray-100'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
              `}
              style={{
                backgroundColor: config.mode === 'internet' ? courseColors.primary : undefined
              }}
            >
              <Globe className="w-3 h-3 inline mr-1" />
              Internet
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showWork || false}
              onChange={(e) => updateConfig('showWork', e.target.checked)}
              disabled={isDisabled}
              className="accent-current"
              style={{ accentColor: courseColors.primary }}
            />
            <span className="text-sm">Don't show work</span>
          </label>
        </div>

        {/* Agent-specific configuration */}
        {renderConfigOptions()}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">AI Model</label>
          <select
            value={config.model || 'gpt-4'}
            onChange={(e) => updateConfig('model', e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
            style={{ 
              borderColor: courseColors.primary + '40',
              focusBorderColor: courseColors.primary 
            }}
          >
            <option value="gpt-4">GPT-4 (Most Capable)</option>
            <option value="gpt-3.5">GPT-3.5 (Faster)</option>
            <option value="claude">Claude (Analytical)</option>
          </select>
        </div>
      </div>
    </div>
  );
}