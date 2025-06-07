"use client";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { Settings, Sliders, Brain, Zap } from "lucide-react";
import { useState, useEffect } from "react";

export default function TerminalSettings({ 
  onSettingsChange, 
  currentSettings = {},
  customColors 
}) {
  const [settings, setSettings] = useState({
    temperature: 0.7,
    model: "claude-3-7-sonnet-latest",
    style: "balanced",
    ...currentSettings
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const styles = [
    { value: "concise", label: "Concise", icon: "⚡", description: "Brief, to-the-point responses" },
    { value: "balanced", label: "Balanced", icon: "⚖️", description: "Clear and informative" },
    { value: "detailed", label: "Detailed", icon: "📚", description: "Comprehensive explanations" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          style={{ 
            color: customColors?.primary || "#6366f1",
            borderColor: customColors?.primary || "#6366f1"
          }}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Terminal Settings</SheetTitle>
          <SheetDescription>
            Customize how the AI assistant responds to your queries
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Response Style */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Brain className="w-4 h-4" style={{ color: customColors?.primary }} />
              Response Style
            </div>
            <div className="space-y-2">
              {styles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => handleSettingChange("style", style.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    settings.style === style.value
                      ? "border-2"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={{
                    borderColor: settings.style === style.value ? customColors?.primary : undefined,
                    backgroundColor: settings.style === style.value ? `${customColors?.primary}10` : undefined
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {style.icon} {style.label}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{style.description}</p>
                    </div>
                    {settings.style === style.value && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: customColors?.primary }}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sliders className="w-4 h-4" style={{ color: customColors?.primary }} />
              Creativity Level
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange("temperature", parseFloat(e.target.value))}
                className="w-full"
                style={{
                  accentColor: customColors?.primary
                }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Focused</span>
                <span className="font-mono">{settings.temperature}</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4" style={{ color: customColors?.primary }} />
              AI Model
            </div>
            <select
              value={settings.model}
              onChange={(e) => handleSettingChange("model", e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{
                focusRingColor: customColors?.primary
              }}
            >
              <option value="claude-3-7-sonnet-latest">Claude 3 Sonnet (Latest)</option>
              <option value="claude-3-haiku-latest">Claude 3 Haiku (Fast)</option>
            </select>
          </div>

          {/* Reset to Defaults */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const defaults = {
                  temperature: 0.7,
                  model: "claude-3-7-sonnet-latest",
                  style: "balanced"
                };
                setSettings(defaults);
                if (onSettingsChange) {
                  onSettingsChange(defaults);
                }
              }}
              className="w-full"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}