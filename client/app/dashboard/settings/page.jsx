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
import { Button } from "../../components/ui/button";
import { useSchoolUpdate } from "../../context/SchoolUpdateContext";

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

const ThemeConfiguration = () => {
  const { user: clerkUser, isLoaded } = useUser();
  const { triggerSchoolUpdate } = useSchoolUpdate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [customPrimary, setCustomPrimary] = useState("");
  const [customSecondary, setCustomSecondary] = useState("");
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [schoolLogoPreview, setSchoolLogoPreview] = useState("");
  const fileInputRef = useRef(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (isLoaded && clerkUser) {
      const loadInitialData = async () => {
        try {
          setIsLoading(true);
          setError("");
          const data = await fetchUserByClerkId(clerkUser.id);
          setUserData(data);
          setCustomPrimary(data?.customPrimaryColor || "");
          setCustomSecondary(data?.customSecondaryColor || "");
          setSchoolLogoPreview(data?.schoolLogo || "");
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setError(err.message || "Could not load theme data.");
        }
        setIsLoading(false);
      };
      loadInitialData();
    }
  }, [clerkUser, isLoaded]);

  const handleLogoFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSchoolLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!clerkUser) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      const updatedUser = await updateUserCustomThemeColors(
        clerkUser.id,
        customPrimary || "",
        customSecondary || "",
        schoolLogo
      );
      setUserData(updatedUser.user);
      setSchoolLogo(null);
      setSchoolLogoPreview(updatedUser.user?.schoolLogo || "");
      setCustomPrimary(updatedUser.user?.customPrimaryColor || "");
      setCustomSecondary(updatedUser.user?.customSecondaryColor || "");
      setSaveSuccess(true);
      triggerSchoolUpdate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save changes:", err);
      setSaveError(err.message || "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToSchoolColors = async () => {
    if (!clerkUser) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      const updatedUser = await updateUserCustomThemeColors(
        clerkUser.id,
        "",
        "",
        null
      );
      setUserData(updatedUser.user);
      setCustomPrimary("");
      setCustomSecondary("");
      setSchoolLogo(null);
      setSchoolLogoPreview(updatedUser.user?.schoolLogo || "");
      setSaveSuccess(true);
      triggerSchoolUpdate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to reset to school colors:", err);
      setSaveError(err.message || "Could not reset colors.");
    } finally {
      setIsSaving(false);
    }
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
  const canSaveChanges = colorsHaveChanged || newLogoIsStaged;

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
              onColorChange={(e) => setCustomPrimary(e.target.value)}
            />
            <ColorSwatch
              displayColor={effectiveSecondary}
              label="Secondary"
              inputId="customSecondaryPicker"
              currentColorValue={customSecondary}
              onColorChange={(e) => setCustomSecondary(e.target.value)}
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
              className="w-full sm:w-auto text-xs"
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

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 mt-6">
        <Button
          onClick={handleSaveChanges}
          disabled={isSaving || !canSaveChanges}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}{" "}
          Save Changes
        </Button>
        <Button
          onClick={handleResetToSchoolColors}
          variant="outline"
          disabled={
            isSaving ||
            (!colorsHaveChanged &&
              !newLogoIsStaged &&
              !userData?.customPrimaryColor &&
              !userData?.customSecondaryColor)
          }
          className="w-full sm:w-auto cursor-pointer"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to School Colors
        </Button>
      </div>
      {saveSuccess && (
        <p className="mt-3 text-sm text-green-600 flex items-center">
          <CheckCircle className="mr-2 h-4 w-4" />
          Changes saved successfully!
        </p>
      )}
      {saveError && (
        <p className="mt-3 text-sm text-red-600 flex items-center">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Error: {saveError}
        </p>
      )}

      {!userData.school && (
        <p className="mt-6 text-sm text-gray-600 bg-yellow-50 border border-yellow-300 p-4 rounded-md">
          Tip: Set your school in your profile settings to get default theme
          colors.
        </p>
      )}
    </div>
  );
};

export default function Settings() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p className="text-gray-600">
        Manage your account settings and preferences.
      </p>
      <ThemeConfiguration />
    </main>
  );
}
