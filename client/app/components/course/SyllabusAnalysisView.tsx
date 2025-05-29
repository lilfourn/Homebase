"use client";

import { useMatchedTA } from "@/app/hooks/course/useMatchedTA";
import { ParsedSyllabusData } from "@/app/hooks/syllabus/useSyllabusProcessing";
import {
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  UserCheck,
  Users,
} from "lucide-react";
import moment from "moment";
import { SyllabusCalendarView } from "./SyllabusCalendarView";

interface SyllabusAnalysisViewProps {
  parsedData: ParsedSyllabusData;
  courseInstanceId?: string;
}

// Simple Card component
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

export const SyllabusAnalysisView: React.FC<SyllabusAnalysisViewProps> = ({
  parsedData,
  courseInstanceId,
}) => {
  const { matchResult } = useMatchedTA(courseInstanceId || null);
  return (
    <div className="space-y-6">
      {/* Calendar View */}
      <SyllabusCalendarView parsedData={parsedData} />

      {/* Data Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Grading Breakdown */}
        {parsedData.gradingBreakdown &&
          Object.keys(parsedData.gradingBreakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Grading Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(parsedData.gradingBreakdown).map(
                    ([category, percentage]) => (
                      <div
                        key={category}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm capitalize">{category}</span>
                        <Badge variant="secondary">{percentage}%</Badge>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Assignments */}
        {parsedData.assignmentDates &&
          parsedData.assignmentDates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Assignments ({parsedData.assignmentDates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedData.assignmentDates.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Exams */}
        {parsedData.examDates && parsedData.examDates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Exams ({parsedData.examDates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedData.examDates.map((item, index) => (
                  <div key={index} className="p-3 border rounded-lg">
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts */}
        {parsedData.contacts && parsedData.contacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Course Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {parsedData.contacts.map((contact, index) => {
                  const isMatchedTA =
                    matchResult?.matchedTA &&
                    matchResult.matchedTA.email === contact.email;
                  return (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg ${
                        isMatchedTA ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
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
                        </div>
                        {isMatchedTA && (
                          <UserCheck className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
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
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confidence Score */}
        {parsedData.confidence && (
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  AI Confidence Score
                </span>
                <Badge
                  variant={
                    parsedData.confidence > 0.8
                      ? "default"
                      : parsedData.confidence > 0.6
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {Math.round(parsedData.confidence * 100)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
