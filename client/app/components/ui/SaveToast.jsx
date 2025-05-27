"use client";

import { useUser } from "@clerk/nextjs";
import { CheckCircle, Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import {
  fetchUserByClerkId,
  updateUserCustomThemeColors,
  updateUserSchoolAndColors,
} from "../../api/users.api";
import { useSchoolUpdate } from "../../context/SchoolUpdateContext";
import { useSettings } from "../../context/SettingsContext";
import { Button } from "./button";

const SaveToast = ({ onDataUpdate }) => {
  const { user: clerkUser } = useUser();
  const { triggerSchoolUpdate } = useSchoolUpdate();
  const { changes, hasChanges, isSaving, setSaving, clearChanges } =
    useSettings();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSaveAll = async () => {
    if (!clerkUser || !hasChanges) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError("");

    try {
      // Save university changes first if they exist
      if (changes.university) {
        await updateUserSchoolAndColors(clerkUser.id, changes.university);
      }

      // Save theme changes if they exist
      if (
        changes.customPrimary !== null ||
        changes.customSecondary !== null ||
        changes.schoolLogo !== null
      ) {
        await updateUserCustomThemeColors(
          clerkUser.id,
          changes.customPrimary || "",
          changes.customSecondary || "",
          changes.schoolLogo
        );
      }

      // Fetch updated user data
      const updatedUserData = await fetchUserByClerkId(clerkUser.id);

      // Notify parent component to update data
      if (onDataUpdate) {
        onDataUpdate(updatedUserData);
      }

      // Clear all changes and show success
      clearChanges();
      setSaveSuccess(true);

      // Trigger school update to refresh theme
      triggerSchoolUpdate();

      // Force a small delay to ensure the theme system picks up the changes
      setTimeout(() => {
        triggerSchoolUpdate();
      }, 500);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save changes:", err);
      setSaveError(err.message || "Could not save changes.");
      setTimeout(() => setSaveError(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    clearChanges();
    setSaveError("");
  };

  if (!hasChanges && !saveSuccess && !saveError) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        {saveSuccess ? (
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Changes saved successfully!
              </p>
              <p className="text-xs text-green-700">
                Theme and settings updated.
              </p>
            </div>
          </div>
        ) : saveError ? (
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Error saving changes
              </p>
              <p className="text-xs text-red-700 mt-1">{saveError}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-red-400 hover:text-red-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                You have unsaved changes
              </p>
              <p className="text-xs text-gray-600">
                {[
                  changes.university && "University",
                  (changes.customPrimary !== null ||
                    changes.customSecondary !== null) &&
                    "Theme colors",
                  changes.schoolLogo !== null && "School logo",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </button>
              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                Save All
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaveToast;
