"use client";
import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fetchUserByClerkId,
  updateUserCustomThemeColors,
} from "../../api/users.api";
import GoogleDriveSettings from "../../components/settings/GoogleDriveSettings";
import UniversitySelection from "../../components/settings/UniversitySelection";
import { Button } from "../../components/ui/button";
import SaveToast from "../../components/ui/SaveToast";
import { useSchoolUpdate } from "../../context/SchoolUpdateContext";
import { SettingsProvider, useSettings } from "../../context/SettingsContext";

// Helper component to display a color swatch
const ColorSwatch = ({
  displayColor,
  label,
  inputId,
  currentColorValue,
  onColorChange,
}) => {
  const visualColor =
    displayColor &&
    typeof displayColor === "string" &&
    displayColor.startsWith("#")
      ? displayColor
      : null;

  return (
    <div className="flex flex-col items-center text-center w-24">
      <label htmlFor={inputId} className="relative cursor-pointer group">
        <div
          className={`w-16 h-16 rounded-md border border-gray-300 flex items-center justify-center text-xs transition-all group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-1 ${
            visualColor ? "" : "bg-gray-100 text-gray-500"
          }`}
          style={visualColor ? { backgroundColor: visualColor } : {}}
        >
          {!visualColor && "N/A"}
          <input
            type="color"
            id={inputId}
            value={currentColorValue || "#000000"}
            onChange={onColorChange}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
          />
        </div>
      </label>
      <span className="mt-2 text-sm text-gray-600 block truncate w-full">
        {label}
      </span>
      {visualColor && (
        <span className="mt-1 text-xs text-gray-500 uppercase block truncate w-full">
          {visualColor}
        </span>
      )}
    </div>
  );
};

const ThemeConfiguration = ({ userData, onDataChange }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { updateChange } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [customPrimary, setCustomPrimary] = useState("");
  const [customSecondary, setCustomSecondary] = useState("");
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [schoolLogoPreview, setSchoolLogoPreview] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isLoaded && clerkUser && userData) {
      console.log(
        "[ThemeConfiguration] Updating with new user data:",
        userData
      );
      setCustomPrimary(userData?.customPrimaryColor || "");
      setCustomSecondary(userData?.customSecondaryColor || "");
      setSchoolLogoPreview(userData?.schoolLogo || "");
      setSchoolLogo(null); // Clear any staged logo
      setIsLoading(false);
    }
  }, [clerkUser, isLoaded, userData]);

  // Separate effect to clear changes when userData changes
  useEffect(() => {
    if (userData) {
      // Clear any pending changes in settings context when data updates
      // This prevents stale change detection
      const timer = setTimeout(() => {
        updateChange("customPrimary", null, false);
        updateChange("customSecondary", null, false);
        updateChange("schoolLogo", null, false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    userData?.customPrimaryColor,
    userData?.customSecondaryColor,
    userData?.schoolLogo,
  ]); // Only depend on the actual values

  const handleLogoFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSchoolLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Update settings context
      updateChange("schoolLogo", file, true);
    }
  };

  const handlePrimaryColorChange = (e) => {
    const newColor = e.target.value;
    setCustomPrimary(newColor);

    // Update settings context
    const hasChanged = newColor !== (userData?.customPrimaryColor || "");
    updateChange("customPrimary", hasChanged ? newColor : null, hasChanged);
  };

  const handleSecondaryColorChange = (e) => {
    const newColor = e.target.value;
    setCustomSecondary(newColor);

    // Update settings context
    const hasChanged = newColor !== (userData?.customSecondaryColor || "");
    updateChange("customSecondary", hasChanged ? newColor : null, hasChanged);
  };

  const handleResetToSchoolColors = () => {
    setCustomPrimary("");
    setCustomSecondary("");
    setSchoolLogo(null);
    setSchoolLogoPreview(userData?.schoolLogo || "");

    // Update settings context to indicate reset
    updateChange("customPrimary", "", true);
    updateChange("customSecondary", "", true);
    updateChange("schoolLogo", null, true);
  };

  const effectivePrimary = customPrimary || userData?.schoolColors?.primary;
  const effectiveSecondary =
    customSecondary || userData?.schoolColors?.secondary;
  const effectiveLogo = schoolLogoPreview || userData?.schoolLogo;

  if (!isLoaded || isLoading) {
    return (
      <div className="mt-10 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="flex items-center mb-4">
          <Palette className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">
            Theme Configuration
          </h2>
        </div>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-md bg-gray-300 h-16 w-16"></div>
          <div className="rounded-md bg-gray-300 h-16 w-16"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 p-6 border border-red-300 rounded-lg shadow-sm bg-red-50">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
          <h2 className="text-xl font-semibold text-red-700">
            Theme Configuration Error
          </h2>
        </div>
        <p className="text-red-600">Error loading theme data: {error}</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="mt-10 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="flex items-center mb-4">
          <Palette className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">
            Theme Configuration
          </h2>
        </div>
        <p className="text-gray-600">
          No theme data available. Please try refreshing.
        </p>
      </div>
    );
  }

  const previewTextColor = "#FFFFFF";
  const previewSubTextColor = "#E5E7EB";

  const colorsHaveChanged =
    customPrimary !== (userData?.customPrimaryColor || "") ||
    customSecondary !== (userData?.customSecondaryColor || "");
  const newLogoIsStaged = !!schoolLogo;
  const hasAnyChanges = colorsHaveChanged || newLogoIsStaged;

  return (
    <div className="mt-10 p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="flex items-center mb-1">
        <Palette className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-800">
          Theme Configuration
        </h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Click on the color swatches below to customize. Your theme defaults to
        your school:{" "}
        <span className="font-medium text-gray-700">
          {userData.school || "Not set"}
        </span>
        .
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-2">
            Current Theme Colors{" "}
            <span className="text-xs text-gray-500">(Click to edit)</span>
          </h3>
          <div className="flex space-x-4 p-4 bg-gray-50 rounded-md border border-gray-200 justify-center sm:justify-start">
            <ColorSwatch
              displayColor={effectivePrimary}
              label="Primary"
              inputId="customPrimaryPicker"
              currentColorValue={customPrimary}
              onColorChange={handlePrimaryColorChange}
            />
            <ColorSwatch
              displayColor={effectiveSecondary}
              label="Secondary"
              inputId="customSecondaryPicker"
              currentColorValue={customSecondary}
              onColorChange={handleSecondaryColorChange}
            />
          </div>
        </div>
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-2">
            School Logo
          </h3>
          <div className="flex flex-col items-center sm:items-start p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="w-24 h-24 mb-3 rounded-md border border-gray-300 flex items-center justify-center bg-white overflow-hidden transition-all relative">
              {effectiveLogo ? (
                <img
                  src={effectiveLogo}
                  alt="School Logo Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoFileChange}
              accept="image/png, image/jpeg, image/gif, image/webp"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs cursor-pointer"
            >
              <UploadCloud className="mr-1.5 h-3 w-3" />
              {effectiveLogo && !schoolLogo ? "Change Logo" : "Upload Logo"}
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
              Max 2MB. PNG, JPG, GIF, WEBP.
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-2">Preview</h3>
          <div
            className="p-4 rounded-md border-2 h-auto min-h-[7rem] flex flex-col justify-start shadow-inner"
            style={{
              backgroundColor: effectivePrimary || "#E5E7EB",
              borderColor: effectiveSecondary || "#D1D5DB",
            }}
          >
            {effectiveLogo && (
              <div className="mb-2 flex justify-center items-center p-2 bg-white bg-opacity-20 rounded max-h-20">
                <img
                  src={effectiveLogo}
                  alt="School Logo Preview"
                  className="max-h-16 max-w-full object-contain rounded"
                />
              </div>
            )}
            <p
              className="text-sm font-semibold truncate"
              style={{ color: previewTextColor }}
            >
              Example Primary BG
            </p>
            <p
              className="text-xs truncate"
              style={{ color: previewSubTextColor }}
            >
              Example Secondary Border
            </p>
          </div>
        </div>
      </div>

      {hasAnyChanges && (
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 mt-6">
          <Button
            onClick={handleResetToSchoolColors}
            variant="outline"
            className="w-full sm:w-auto cursor-pointer"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset to School Colors
          </Button>
          <p className="text-sm text-gray-600">
            Changes will be saved when you click "Save All"
          </p>
        </div>
      )}

      {!userData.school && (
        <p className="mt-6 text-sm text-gray-600 bg-yellow-50 border border-yellow-300 p-4 rounded-md">
          Tip: Set your university in the University Selection section above to
          get default theme colors and branding.
        </p>
      )}
    </div>
  );
};

function SettingsContent() {
  const { user: clerkUser, isLoaded } = useUser();
  const { updateCount } = useSchoolUpdate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && clerkUser) {
      const loadInitialData = async () => {
        try {
          setIsLoading(true);
          setError("");
          const data = await fetchUserByClerkId(clerkUser.id);
          setUserData(data);
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setError(err.message || "Could not load user data.");
        }
        setIsLoading(false);
      };
      loadInitialData();
    }
  }, [clerkUser, isLoaded, updateCount]);

  const handleDataUpdate = (newUserData) => {
    console.log("[Settings] Updating user data:", newUserData);
    setUserData(newUserData);

    // Force a re-render of theme configuration with new data
    setTimeout(() => {
      console.log(
        "[Settings] Triggering additional school update for theme refresh"
      );
      // This will trigger the ThemeApplicator to refresh
    }, 100);
  };

  if (!isLoaded || isLoading) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="text-gray-600 mb-8">
          Manage your account settings and preferences.
        </p>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-8"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error loading settings: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="text-gray-600 mb-8">
          Manage your account settings and preferences.
        </p>
        <div className="space-y-8">
          <UniversitySelection
            userData={userData}
            onDataChange={handleDataUpdate}
          />
          <ThemeConfiguration
            userData={userData}
            onDataChange={handleDataUpdate}
          />
          <GoogleDriveSettings />
        </div>
      </main>
      <SaveToast onDataUpdate={handleDataUpdate} />
    </>
  );
}

export default function Settings() {
  return (
    <SettingsProvider>
      <SettingsContent />
    </SettingsProvider>
  );
}
