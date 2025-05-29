import { getGooglePickerConfig } from "@/app/api/googleDrive.api";
import {
  UseGooglePickerReturn,
  UserData,
  UseToastReturn,
} from "@/app/types/course.types";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

interface UseGooglePickerProps {
  userData: UserData | null;
  courseInstanceId: string;
  showToast: UseToastReturn["showToast"];
  onFileSelected: (docs: any) => Promise<void>;
}

export const useGooglePicker = ({
  userData,
  courseInstanceId,
  showToast,
  onFileSelected,
}: UseGooglePickerProps): UseGooglePickerReturn => {
  const { getToken } = useAuth();

  const [isUploadingSyllabus, setIsUploadingSyllabus] = useState(false);
  const pickerApiLoaded = useRef(false);
  const pickerConfigRef = useRef<any>(null);

  // Initialize Google Picker API
  useEffect(() => {
    if (!pickerApiLoaded.current && userData?.googleDrive?.connected) {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load("picker", () => {
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
  }, [userData?.googleDrive?.connected]);

  // Upload syllabus with Google Picker
  const handleUploadSyllabus = async () => {
    // Check if Google Drive is connected
    if (!userData?.googleDrive?.connected) {
      showToast(
        "Please connect your Google Drive account first. Go to Settings to connect.",
        "error"
      );
      return;
    }

    if (!pickerApiLoaded.current || !window.gapi?.picker) {
      showToast(
        "Google Picker not loaded. Please ensure Google Drive is connected.",
        "error"
      );
      return;
    }

    if (!courseInstanceId) {
      showToast(
        "Course information is missing. Cannot upload syllabus.",
        "error"
      );
      return;
    }

    try {
      setIsUploadingSyllabus(true);
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
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            await onFileSelected(data.docs);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err: any) {
      console.error("Failed to show picker:", err);
      showToast(err.message || "Could not open file picker.", "error");
      pickerConfigRef.current = null;
    } finally {
      setIsUploadingSyllabus(false);
    }
  };

  return {
    isUploadingSyllabus,
    handleUploadSyllabus,
  };
};
