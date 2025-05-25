"use client";

import { syncUserData } from "@/app/api/users.api";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useSchoolUpdate } from "@/app/context/SchoolUpdateContext";
import { testApiConnection } from "@/app/utils/apiTest";
import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  GraduationCap,
  Loader2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SchoolSelectionModal() {
  const { user } = useUser();
  const { triggerSchoolUpdate } = useSchoolUpdate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [universities, setUniversities] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      testApiConnection().then((result) => {
        if (result.success) {
          console.log("API connection successful:", result.data);
          checkUserSchool();
        } else {
          console.error("API connection failed:", result.error);
          setError(`Cannot connect to server: ${result.error}`);
          setIsOpen(true);
        }
      });
    }
  }, [user]);

  const checkUserSchool = async () => {
    try {
      console.log("Checking user school for user:", user.id);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log("API URL from env:", apiBaseUrl);

      if (!apiBaseUrl) {
        console.error("NEXT_PUBLIC_API_URL environment variable not set");
        setIsOpen(true);
        return;
      }

      // Remove trailing slash if present
      const cleanApiUrl = apiBaseUrl.replace(/\/$/, "");
      const apiUrl = `${cleanApiUrl}/api/users/${user.id}`;
      console.log("Full API endpoint:", apiUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeoutId);

        console.log("Response status:", response.status);
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );

        if (response.ok) {
          const userData = await response.json();
          console.log("User data received:", userData);

          if (!userData.school || userData.school.trim() === "") {
            console.log("User has no school, showing modal");
            setIsOpen(true);
          } else {
            console.log("User has school:", userData.school);
          }
        } else if (response.status === 404) {
          console.log("User not found in DB (404), showing modal");
          setIsOpen(true);
        } else {
          console.error("Unexpected response status:", response.status);
          const errorText = await response.text();
          console.error("Error response body:", errorText);
          setIsOpen(true);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === "AbortError") {
          console.error("Request timed out after 10 seconds");
          setError(
            "Connection timed out. Please check your internet connection."
          );
        } else {
          console.error("Fetch error:", fetchError);
          setError("Unable to connect to server. Please try again later.");
        }
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Network error checking user school:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      setError("Unable to check user school. Please try again later.");
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!schoolName.trim() || schoolName.length < 3) {
      setUniversities([]);
      return;
    }

    const timerId = setTimeout(async () => {
      setIsLoading(true);
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
        setUniversities(data.slice(0, 15)); // Limit to 15 results
      } catch (err) {
        console.error("Universities API error:", err);
        setError(`Failed to search universities: ${err.message}`);
        setUniversities([]);
      } finally {
        setIsLoading(false);
      }
    }, 600); // Slightly longer debounce

    return () => clearTimeout(timerId);
  }, [schoolName]);

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school.name);
    setSchoolName(school.name);
    setUniversities([]);
  };

  const handleManualEntry = () => {
    setSelectedSchool(schoolName);
  };

  const handleNextStep = () => {
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    const schoolToSubmit = selectedSchool || schoolName;

    if (!schoolToSubmit.trim()) {
      setError("Please enter or select a school");
      return;
    }

    console.log("Submitting school:", schoolToSubmit);
    console.log("User ID:", user.id);

    setIsSubmitting(true);
    setError("");

    try {
      // Use the sync API to save school and sync user data from Clerk
      const responseData = await syncUserData(user.id, schoolToSubmit);
      console.log("User sync successful:", responseData);

      // Trigger school update in sidebar
      triggerSchoolUpdate();

      setIsOpen(false);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error syncing user data:", error);
      setError(`Failed to save school and sync user data: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <User className="h-8 w-8 text-blue-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome, {user.firstName}!
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Let's complete your profile to get you started. We'll need to know
          which school you attend to personalize your experience and connect you
          with relevant courses and resources.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
        <h3 className="font-medium text-blue-900 mb-2">What we'll collect:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your school or university name</li>
          <li>• This helps us personalize your dashboard</li>
          <li>• Connect you with relevant academic resources</li>
        </ul>
      </div>

      <Button
        onClick={handleNextStep}
        className="w-full bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
        size="lg"
      >
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderSchoolSelectionStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handlePreviousStep}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Add Your School
          </h2>
          <p className="text-sm text-gray-600">Step 2 of 2</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          School Name
        </label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="Enter your school name"
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          <span className="text-sm text-gray-600">Searching schools...</span>
        </div>
      )}

      {universities.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
          {universities.map((uni, index) => (
            <button
              key={index}
              onClick={() => handleSchoolSelect(uni)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
            >
              <h3 className="font-medium text-gray-900">{uni.name}</h3>
              <p className="text-sm text-gray-600">{uni.country}</p>
            </button>
          ))}
        </div>
      )}

      {schoolName.length >= 3 &&
        universities.length === 0 &&
        !isLoading &&
        !error && (
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">
              Can't find your school? You can enter it manually:
            </p>
            <button
              onClick={() => handleSchoolSelect({ name: schoolName })}
              className="w-full p-2 text-left bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="font-medium">Use: "{schoolName}"</span>
            </button>
          </div>
        )}

      {selectedSchool && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-900">Selected:</p>
          <p className="text-blue-800">{selectedSchool}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={
          (!selectedSchool.trim() && !schoolName.trim()) || isSubmitting
        }
        className="w-full bg-blue-600 text-white cursor-pointer hover:bg-blue-700 disabled:opacity-50"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin h-4  text-white w-4 mr-2" />
            Saving...
          </>
        ) : (
          "Complete Profile"
        )}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-white" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            {currentStep === 1 ? "Complete Your Profile" : "Add Your School"}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 1 ? renderWelcomeStep() : renderSchoolSelectionStep()}
      </DialogContent>
    </Dialog>
  );
}
