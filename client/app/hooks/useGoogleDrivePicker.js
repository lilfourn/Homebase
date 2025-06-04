'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getGooglePickerConfig, importGoogleDriveFiles } from '../api/googleDrive.api';

/**
 * Reusable hook for Google Drive Picker functionality
 * @param {Object} options
 * @param {string} options.courseId - MongoDB Course._id to associate files with (NOT courseInstanceId)
 * @param {Function} options.onFilesSelected - Callback after files are imported
 * @param {Function} options.onError - Error callback
 */
export function useGoogleDrivePicker({ courseId, onFilesSelected, onError }) {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const pickerApiLoaded = useRef(false);
  const pickerConfigRef = useRef(null);

  // Initialize Google Picker API
  useEffect(() => {
    if (!pickerApiLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('picker', () => {
          pickerApiLoaded.current = true;
        });
      };
      document.body.appendChild(script);
      
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const openPicker = useCallback(async () => {
    if (!pickerApiLoaded.current || !window.gapi?.picker) {
      onError?.('Google Picker not loaded. Please refresh and try again.');
      return;
    }

    // courseId is optional - files can be imported globally without a course

    setIsLoading(true);

    try {
      const token = await getToken();

      if (!pickerConfigRef.current) {
        pickerConfigRef.current = await getGooglePickerConfig(token);
      }

      const { accessToken, developerKey, appId } = pickerConfigRef.current;

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(developerKey)
        .setAppId(appId)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(new window.google.picker.DocsUploadView())
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            await handleFilesSelected(data.docs);
          }
        })
        .build();
      
      picker.setVisible(true);
    } catch (err) {
      console.error('Failed to show picker:', err);
      onError?.(err.message || 'Could not open file picker.');
      pickerConfigRef.current = null; // Reset config on error
    } finally {
      setIsLoading(false);
    }
  }, [courseId, getToken, onError]);

  const handleFilesSelected = async (docs) => {
    setIsLoading(true);

    try {
      const token = await getToken();
      const result = await importGoogleDriveFiles(token, docs, courseId);
      
      // Call the success callback
      onFilesSelected?.(result);
    } catch (err) {
      console.error('Failed to import files:', err);
      onError?.(err.message || 'Could not import selected files.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    openPicker,
    isLoading
  };
}