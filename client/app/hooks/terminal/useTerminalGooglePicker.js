"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getGooglePickerConfig } from "@/app/api/googleDrive.api";
import { importTerminalGoogleDriveFile } from "@/app/api/fileProcessing.api";

/**
 * Hook for Google Drive file picker in Terminal (no courseId required)
 */
export const useTerminalGooglePicker = ({ onFilesImported, showToast }) => {
  const { getToken } = useAuth();
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const pickerApiLoaded = useRef(false);
  const oauthToken = useRef(null);
  const pickerConfigRef = useRef(null);

  // Load Google Picker API
  useEffect(() => {
    if (!pickerApiLoaded.current && typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load("picker", () => {
          pickerApiLoaded.current = true;
          setIsPickerReady(true);
        });
      };
      script.onerror = () => {
        console.error("Failed to load Google Picker API");
        showToast?.({
          title: "Error",
          description: "Failed to load Google Picker. Please refresh the page.",
          variant: "destructive",
        });
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup on unmount
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [showToast]);

  // Open Google Picker
  const openPicker = useCallback(async () => {
    if (!isPickerReady) {
      showToast?.({
        title: "Loading",
        description: "Google Picker is still loading. Please try again.",
      });
      return;
    }

    try {
      // Get auth token and picker config
      const token = await getToken();
      if (!token) {
        showToast?.({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      // Get picker configuration
      const config = await getGooglePickerConfig(token);
      oauthToken.current = config.accessToken;
      pickerConfigRef.current = config;

      // Create and show picker
      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(config.accessToken)
        .setDeveloperKey(config.developerKey)
        .setAppId(config.appId)
        .addView(
          new window.google.picker.DocsView()
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false)
            .setMode(window.google.picker.DocsViewMode.LIST)
        )
        .addView(
          new window.google.picker.DocsView()
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false)
            .setMode(window.google.picker.DocsViewMode.GRID)
            .setLabel("Grid View")
        )
        .addView(window.google.picker.ViewId.RECENTLY_PICKED)
        .setSelectableMimeTypes([
          "application/pdf",
          "application/vnd.google-apps.document",
          "application/vnd.google-apps.spreadsheet",
          "application/vnd.google-apps.presentation",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "text/plain",
          "text/csv",
          "text/markdown",
          "text/html",
          "text/css",
          "text/javascript",
          "application/javascript",
          "application/json",
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ].join(","))
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            await handlePickerCallback(data.docs, token);
          }
        })
        .setTitle("Select Files for Terminal")
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error("Error opening Google Picker:", error);
      showToast?.({
        title: "Error",
        description: error.message || "Failed to open file picker",
        variant: "destructive",
      });
    }
  }, [isPickerReady, getToken, showToast]);

  // Handle picker selection
  const handlePickerCallback = useCallback(
    async (docs, token) => {
      if (!docs || docs.length === 0) return;

      setIsImporting(true);
      const importedFiles = [];
      const errors = [];

      try {
        // Import files one by one
        for (const doc of docs) {
          try {
            console.log(`Importing file for terminal: ${doc.name}`);
            
            // Check file size (50MB limit)
            if (doc.sizeBytes && doc.sizeBytes > 52428800) {
              errors.push({
                fileName: doc.name,
                error: "File size exceeds 50MB limit",
              });
              continue;
            }

            const response = await importTerminalGoogleDriveFile(doc.id, token);
            
            if (response.success) {
              importedFiles.push({
                id: doc.id,
                fileId: doc.id,
                fileName: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes || 0,
                source: 'google_drive',
                webViewLink: doc.url,
                iconLink: doc.iconUrl,
                uploadedAt: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error(`Error importing file ${doc.name}:`, error);
            
            // Handle authentication errors
            if (error.isGoogleDriveAuthError) {
              showToast?.({
                title: "Authentication Error",
                description: "Please reconnect your Google Drive in Settings",
                variant: "destructive",
              });
              // Stop importing if auth fails
              break;
            }
            
            errors.push({
              fileName: doc.name,
              error: error.message || "Failed to import",
            });
          }
        }

        // Show results
        if (importedFiles.length > 0) {
          showToast?.({
            title: "Success",
            description: `Imported ${importedFiles.length} file${
              importedFiles.length > 1 ? "s" : ""
            }`,
          });
          
          // Notify parent component
          onFilesImported?.(importedFiles);
        }

        if (errors.length > 0) {
          const errorMessage = errors
            .map((e) => `${e.fileName}: ${e.error}`)
            .join("\n");
          showToast?.({
            title: "Import Errors",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error during import:", error);
        showToast?.({
          title: "Error",
          description: "Failed to import files. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
      }
    },
    [onFilesImported, showToast]
  );

  return {
    openPicker,
    isPickerReady,
    isImporting,
  };
};