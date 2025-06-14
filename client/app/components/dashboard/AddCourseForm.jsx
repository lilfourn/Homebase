"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { useCourses } from "@/app/context/CourseContext";
import { Loader2, PlusCircle } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import LucideReactLibrary from "../ui/lucideReactLibrary";

export default function AddCourseForm() {
  const { addCourse } = useCourses();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  // Check if required fields are filled
  const checkFormValidity = () => {
    return name.trim() !== "" && code.trim() !== "";
  };

  // Update form validity when name or code changes
  useEffect(() => {
    setIsFormValid(checkFormValidity());
  }, [name, code]);

  // Update form validity when required fields change
  const updateFormValidity = () => {
    setIsFormValid(name.trim() !== "" && code.trim() !== "");
  };

  // Handle name change
  const handleNameChange = (e) => {
    setName(e.target.value);
    updateFormValidity();
  };

  // Handle code change
  const handleCodeChange = (e) => {
    setCode(e.target.value);
    updateFormValidity();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Prepare the course data
    const courseData = { name, code, description, icon };
    console.log("→ Adding course:", courseData);

    try {
      // Use the context method to add the course
      await addCourse(courseData);

      // Reset form fields on success
      setName("");
      setCode("");
      setDescription("");
      setIcon("");
      setOpen(false);

      console.log("✓ Course added successfully");
    } catch (err) {
      console.error("✗ AddCourseForm error:", err);
      setError(err.message || "Failed to add course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="cursor-pointer bg-[var(--custom-primary-color,#3B82F6)] hover:bg-opacity-90 text-white transition-all duration-200 w-full rounded-xl"
        >
          <PlusCircle className="h-5 w-5" />
          <span className="ml-2 font-medium">
            Add Course
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Add a Course</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Name
              <input
                value={name}
                onChange={handleNameChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="Course name"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Code
              <input
                value={code}
                onChange={handleCodeChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="Course code"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="Course description"
              />
            </label>
          </div>

          <div className="space-y-2">
            <LucideReactLibrary value={icon} onChange={setIcon} />
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={loading}
              className={`cursor-pointer ${
                isFormValid ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Saving...
                </>
              ) : (
                "Save Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
