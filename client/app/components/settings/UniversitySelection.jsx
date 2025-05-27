"use client";

import { useUser } from "@clerk/nextjs";
import { AlertTriangle, GraduationCap, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchUserByClerkId } from "../../api/users.api";
import { useSettings } from "../../context/SettingsContext";

const UniversitySelection = ({ userData, onDataChange }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { updateChange } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [universities, setUniversities] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isLoaded && clerkUser && userData) {
      console.log(
        "[UniversitySelection] Updating with new user data:",
        userData
      );
      setSelectedSchool(userData?.school || "");
      setSchoolName(userData?.school || "");
      setIsLoading(false);
    }
  }, [clerkUser, isLoaded, userData]);

  // Separate effect to clear changes when userData changes
  useEffect(() => {
    if (userData) {
      // Clear any pending university changes when data updates
      const timer = setTimeout(() => {
        updateChange("university", null, false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [userData?.school]); // Only depend on the school value, not the function

  // Search universities with debouncing
  useEffect(() => {
    if (!schoolName.trim() || schoolName.length < 3) {
      setUniversities([]);
      return;
    }

    const timerId = setTimeout(async () => {
      setIsSearching(true);
      setError("");
      try {
        const response = await fetch(
          `/api/actions/universities?name=${encodeURIComponent(schoolName)}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }
        const data = await response.json();
        setUniversities(data.slice(0, 10)); // Limit to 10 results
      } catch (err) {
        console.error("Universities API error:", err);
        setError(`Failed to search universities: ${err.message}`);
        setUniversities([]);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(timerId);
  }, [schoolName]);

  const handleSchoolSelect = (school) => {
    const newSchool = school.name;
    setSelectedSchool(newSchool);
    setSchoolName(newSchool);
    setUniversities([]);

    // Update the settings context with the change
    const hasChanged = newSchool !== (userData?.school || "");
    updateChange("university", hasChanged ? newSchool : null, hasChanged);
  };

  const handleSchoolNameChange = (e) => {
    const newName = e.target.value;
    setSchoolName(newName);

    // If user is typing and it's different from current school, mark as changed
    if (newName !== selectedSchool && newName.length >= 3) {
      const hasChanged = newName !== (userData?.school || "");
      updateChange("university", hasChanged ? newName : null, hasChanged);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="flex items-center mb-4">
          <GraduationCap className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">
            University Selection
          </h2>
        </div>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-md bg-gray-300 h-10 flex-1"></div>
          <div className="rounded-md bg-gray-300 h-10 w-20"></div>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="p-6 border border-red-300 rounded-lg shadow-sm bg-red-50">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
          <h2 className="text-xl font-semibold text-red-700">
            University Selection Error
          </h2>
        </div>
        <p className="text-red-600">Error loading user data: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="flex items-center mb-1">
        <GraduationCap className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-800">
          University Selection
        </h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Change your university to automatically update your theme colors and
        branding.
        {userData?.school && (
          <span className="block mt-1">
            Current university:{" "}
            <span className="font-medium text-gray-700">{userData.school}</span>
          </span>
        )}
      </p>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search for your university
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={schoolName}
              onChange={handleSchoolNameChange}
              placeholder="Enter university name (min 3 characters)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {isSearching && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            <span className="text-sm text-gray-600">
              Searching universities...
            </span>
          </div>
        )}

        {universities.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {universities.map((uni, index) => (
              <button
                key={index}
                onClick={() => handleSchoolSelect(uni)}
                className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none cursor-pointer"
              >
                <h3 className="font-medium text-gray-900">{uni.name}</h3>
                <p className="text-sm text-gray-600">{uni.country}</p>
              </button>
            ))}
          </div>
        )}

        {schoolName.length >= 3 &&
          universities.length === 0 &&
          !isSearching &&
          !error && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                Can't find your university? You can enter it manually:
              </p>
              <button
                onClick={() => handleSchoolSelect({ name: schoolName })}
                className="w-full p-2 text-left bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <span className="font-medium">Use: "{schoolName}"</span>
              </button>
            </div>
          )}

        {selectedSchool && selectedSchool !== (userData?.school || "") && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-900">Selected:</p>
            <p className="text-blue-800">{selectedSchool}</p>
            <p className="text-xs text-blue-700 mt-1">
              Changes will be saved when you click "Save All"
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversitySelection;
