"use client";

import { updateSyllabusParsedData } from "@/app/api/courses.api";
import { ParsedSyllabusData } from "@/app/hooks/useSyllabusProcessing";
import { useMatchedTA } from "@/app/hooks/useMatchedTA";
import { useAuth } from "@clerk/nextjs";
import {
  Calendar,
  Check,
  Clock,
  Edit2,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import moment from "moment";
import React, { useState } from "react";
import { SyllabusCalendarView } from "./SyllabusCalendarView";
import { SyllabusDataHelper } from "./ui/SyllabusDataHelper";

interface SyllabusAnalysisEditViewProps {
  parsedData: ParsedSyllabusData;
  courseInstanceId: string;
  onDataUpdate?: (updatedData: ParsedSyllabusData) => void;
  showToast?: (message: string, type: "success" | "error") => void;
  onNeedsLastName?: () => void;
}

// Simple Card components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`border rounded-lg shadow-sm bg-white ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pb-4">{children}</div>
);

const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <h3
    className={`text-lg font-semibold leading-none tracking-tight text-gray-900 ${className}`}
  >
    {children}
  </h3>
);

const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

// Simple Badge component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "destructive";
  className?: string;
}> = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-blue-500 text-white",
    secondary: "bg-gray-200 text-gray-800",
    outline: "border border-gray-300 text-gray-700",
    destructive: "bg-red-500 text-white",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const SyllabusAnalysisEditView: React.FC<
  SyllabusAnalysisEditViewProps
> = ({ parsedData, courseInstanceId, onDataUpdate, showToast, onNeedsLastName }) => {
  const { getToken } = useAuth();
  const { matchResult, needsLastName } = useMatchedTA(courseInstanceId);  // TODO: Add course name
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<ParsedSyllabusData>(parsedData);

  // Trigger lastName modal when needed
  React.useEffect(() => {
    if (needsLastName && onNeedsLastName) {
      onNeedsLastName();
    }
  }, [needsLastName, onNeedsLastName]);

  // Handle save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      await updateSyllabusParsedData(courseInstanceId, editedData, token);

      if (onDataUpdate) {
        onDataUpdate(editedData);
      }

      setIsEditMode(false);
      showToast?.("Syllabus data updated successfully", "success");
    } catch (error) {
      console.error("Error saving syllabus data:", error);
      showToast?.("Failed to save syllabus data", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditedData(parsedData);
    setIsEditMode(false);
  };

  // Grading breakdown handlers
  const updateGradingCategory = (
    oldCategory: string,
    newCategory: string,
    percentage: number
  ) => {
    const newBreakdown = { ...editedData.gradingBreakdown };
    if (oldCategory !== newCategory) {
      delete newBreakdown[oldCategory];
    }
    newBreakdown[newCategory] = percentage;
    setEditedData({ ...editedData, gradingBreakdown: newBreakdown });
  };

  const removeGradingCategory = (category: string) => {
    const newBreakdown = { ...editedData.gradingBreakdown };
    delete newBreakdown[category];
    setEditedData({ ...editedData, gradingBreakdown: newBreakdown });
  };

  const addGradingCategory = () => {
    const newBreakdown = {
      ...editedData.gradingBreakdown,
      "New Category": 0,
    };
    setEditedData({ ...editedData, gradingBreakdown: newBreakdown });
  };

  // Assignment handlers
  const updateAssignment = (index: number, assignment: any) => {
    const newAssignments = [...editedData.assignmentDates];
    newAssignments[index] = assignment;
    setEditedData({ ...editedData, assignmentDates: newAssignments });
  };

  const removeAssignment = (index: number) => {
    const newAssignments = editedData.assignmentDates.filter(
      (_, i) => i !== index
    );
    setEditedData({ ...editedData, assignmentDates: newAssignments });
  };

  const addAssignment = () => {
    const newAssignment = {
      title: "New Assignment",
      dueDate: new Date().toISOString(),
      description: "",
    };
    setEditedData({
      ...editedData,
      assignmentDates: [...editedData.assignmentDates, newAssignment],
    });
  };

  // Exam handlers
  const updateExam = (index: number, exam: any) => {
    const newExams = [...editedData.examDates];
    newExams[index] = exam;
    setEditedData({ ...editedData, examDates: newExams });
  };

  const removeExam = (index: number) => {
    const newExams = editedData.examDates.filter((_, i) => i !== index);
    setEditedData({ ...editedData, examDates: newExams });
  };

  const addExam = () => {
    const newExam = {
      title: "New Exam",
      date: new Date().toISOString(),
      description: "",
    };
    setEditedData({
      ...editedData,
      examDates: [...editedData.examDates, newExam],
    });
  };

  // Contact handlers
  const updateContact = (index: number, contact: any) => {
    const newContacts = [...editedData.contacts];
    newContacts[index] = contact;
    setEditedData({ ...editedData, contacts: newContacts });
  };

  const removeContact = (index: number) => {
    const newContacts = editedData.contacts.filter((_, i) => i !== index);
    setEditedData({ ...editedData, contacts: newContacts });
  };

  const addContact = () => {
    const newContact = {
      name: "New Contact",
      role: "Role",
      email: "",
      phone: "",
      officeHours: "",
      assignmentRule: "",
    };
    setEditedData({
      ...editedData,
      contacts: [...editedData.contacts, newContact],
    });
  };

  return (
    <div className="space-y-6">
      {/* Edit Mode Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Syllabus Analysis</h2>
        {!isEditMode ? (
          <button
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            <Edit2 className="h-4 w-4" />
            Edit Data
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Calendar View (always read-only) */}
      <SyllabusCalendarView parsedData={editedData} />

      {/* Data Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Grading Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Grading Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.keys(editedData.gradingBreakdown).length === 0 && !isEditMode && (
                <SyllabusDataHelper hasData={false} dataType="grading" />
              )}
              {Object.entries(editedData.gradingBreakdown).map(
                ([category, percentage]) => (
                  <div
                    key={category}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                  >
                    {isEditMode ? (
                      <>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) =>
                            updateGradingCategory(
                              category,
                              e.target.value,
                              percentage
                            )
                          }
                          className="flex-1 px-2 py-1 text-sm border rounded"
                        />
                        <input
                          type="number"
                          value={percentage}
                          onChange={(e) =>
                            updateGradingCategory(
                              category,
                              category,
                              Number(e.target.value)
                            )
                          }
                          className="w-16 px-2 py-1 text-sm border rounded"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm">%</span>
                        <button
                          onClick={() => removeGradingCategory(category)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm capitalize">
                          {category}
                        </span>
                        <Badge variant="secondary">{percentage}%</Badge>
                      </>
                    )}
                  </div>
                )
              )}
              {isEditMode && (
                <button
                  onClick={addGradingCategory}
                  className="flex items-center gap-2 w-full p-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Assignments ({editedData.assignmentDates.length})
              </span>
              {isEditMode && (
                <button
                  onClick={addAssignment}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {editedData.assignmentDates.length === 0 && !isEditMode && (
                <SyllabusDataHelper hasData={false} dataType="assignments" />
              )}
              {editedData.assignmentDates.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  {isEditMode ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateAssignment(index, {
                            ...item,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 text-sm font-medium border rounded"
                      />
                      <input
                        type="date"
                        value={moment(item.dueDate).format("YYYY-MM-DD")}
                        onChange={(e) =>
                          updateAssignment(index, {
                            ...item,
                            dueDate: new Date(e.target.value).toISOString(),
                          })
                        }
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <textarea
                        value={item.description || ""}
                        onChange={(e) =>
                          updateAssignment(index, {
                            ...item,
                            description: e.target.value,
                          })
                        }
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 text-sm border rounded"
                        rows={2}
                      />
                      <button
                        onClick={() => removeAssignment(index)}
                        className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm text-gray-900">
                          {item.title}
                        </h5>
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {moment(item.dueDate).format("MMM D")}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Exams ({editedData.examDates.length})
              </span>
              {isEditMode && (
                <button
                  onClick={addExam}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {editedData.examDates.length === 0 && !isEditMode && (
                <SyllabusDataHelper hasData={false} dataType="exams" />
              )}
              {editedData.examDates.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  {isEditMode ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateExam(index, { ...item, title: e.target.value })
                        }
                        className="w-full px-2 py-1 text-sm font-medium border rounded"
                      />
                      <input
                        type="date"
                        value={moment(item.date).format("YYYY-MM-DD")}
                        onChange={(e) =>
                          updateExam(index, {
                            ...item,
                            date: new Date(e.target.value).toISOString(),
                          })
                        }
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <textarea
                        value={item.description || ""}
                        onChange={(e) =>
                          updateExam(index, {
                            ...item,
                            description: e.target.value,
                          })
                        }
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 text-sm border rounded"
                        rows={2}
                      />
                      <button
                        onClick={() => removeExam(index)}
                        className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm text-gray-900">
                          {item.title}
                        </h5>
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {moment(item.date).format("MMM D")}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Course Contacts
              </span>
              {isEditMode && (
                <button
                  onClick={addContact}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {editedData.contacts.length === 0 && !isEditMode && (
                <SyllabusDataHelper hasData={false} dataType="contacts" />
              )}
              {editedData.contacts.map((contact, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  {isEditMode ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) =>
                          updateContact(index, {
                            ...contact,
                            name: e.target.value,
                          })
                        }
                        placeholder="Name"
                        className="w-full px-2 py-1 text-sm font-medium border rounded"
                      />
                      <input
                        type="text"
                        value={contact.role}
                        onChange={(e) =>
                          updateContact(index, {
                            ...contact,
                            role: e.target.value,
                          })
                        }
                        placeholder="Role"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <input
                        type="email"
                        value={contact.email || ""}
                        onChange={(e) =>
                          updateContact(index, {
                            ...contact,
                            email: e.target.value,
                          })
                        }
                        placeholder="Email (optional)"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <input
                        type="tel"
                        value={contact.phone || ""}
                        onChange={(e) =>
                          updateContact(index, {
                            ...contact,
                            phone: e.target.value,
                          })
                        }
                        placeholder="Phone (optional)"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={contact.officeHours || ""}
                        onChange={(e) =>
                          updateContact(index, {
                            ...contact,
                            officeHours: e.target.value,
                          })
                        }
                        placeholder="Office Hours (optional)"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={contact.assignmentRule || ""}
                        onChange={(e) =>
                          updateContact(index, {
                            ...contact,
                            assignmentRule: e.target.value,
                          })
                        }
                        placeholder="TA Assignment Rule (e.g., Last names A-M)"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      <button
                        onClick={() => removeContact(index)}
                        className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (() => {
                    const isMatchedTA = matchResult?.matchedTA && matchResult.matchedTA.email === contact.email;
                    return (
                      <div className={isMatchedTA ? 'relative' : ''}>
                        {isMatchedTA && (
                          <div className="absolute -top-2 -right-2">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        <h5 className="font-medium text-sm text-gray-900">
                          {contact.name}
                          {isMatchedTA && (
                            <span className="ml-2 text-blue-600 text-xs font-normal">
                              (Your TA)
                            </span>
                          )}
                        </h5>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {contact.role}
                        </Badge>
                        {contact.email && (
                          <p className="text-xs text-gray-600 mt-1">
                            📧 {contact.email}
                          </p>
                        )}
                        {contact.phone && (
                          <p className="text-xs text-gray-600">
                            📞 {contact.phone}
                          </p>
                        )}
                        {contact.officeHours && (
                          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {contact.officeHours}
                          </p>
                        )}
                        {contact.assignmentRule && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Assignment: {contact.assignmentRule}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Confidence Score */}
        {editedData.confidence && (
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  AI Confidence Score
                </span>
                <Badge
                  variant={
                    editedData.confidence > 0.8
                      ? "default"
                      : editedData.confidence > 0.6
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {Math.round(editedData.confidence * 100)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};