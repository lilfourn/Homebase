"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Separator } from "@/app/components/ui/separator";
import {
  ParsedSyllabusData,
  useSyllabusProcessing,
} from "@/app/hooks/useSyllabusProcessing";
import {
  Brain,
  Calendar,
  CheckCircle,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import moment from "moment";
import { SyllabusCalendarView } from "./SyllabusCalendarView";

interface SyllabusProcessingProps {
  courseInstanceId: string;
  isSignedIn: boolean;
  isLoaded: boolean;
  showToast?: (message: string, type: "success" | "error") => void;
}

interface GradingBreakdownProps {
  gradingBreakdown: Record<string, number>;
}

interface AssignmentsListProps {
  assignments: ParsedSyllabusData["assignmentDates"];
  title: string;
  icon: React.ReactNode;
}

interface ExamsListProps {
  exams: ParsedSyllabusData["examDates"];
  title: string;
  icon: React.ReactNode;
}

interface ContactsListProps {
  contacts: ParsedSyllabusData["contacts"];
}

// Simple Card component since we don't have it in UI
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

const CardDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <p className="text-sm text-gray-600 mt-1">{children}</p>;

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

// Simple Alert component
const Alert: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}> = ({ children, variant = "default", className = "" }) => {
  let alertClasses = "border rounded-lg p-4 flex items-start gap-3";

  if (variant === "default") {
    alertClasses += ` ${className} bg-[var(--custom-primary-color,theme(colors.blue.50))] border-[var(--custom-primary-color,theme(colors.blue.200))] text-[var(--custom-primary-text-color,theme(colors.blue.900))]`;
  } else if (variant === "destructive") {
    alertClasses += ` ${className} bg-red-50 border-red-200 text-red-900`;
  } else {
    alertClasses += ` ${className} bg-gray-50 border-gray-200 text-gray-900`;
  }

  return <div className={alertClasses}>{children}</div>;
};

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="text-sm">{children}</div>;

const GradingBreakdown: React.FC<GradingBreakdownProps> = ({
  gradingBreakdown,
}) => (
  <div className="space-y-3">
    <h4 className="font-medium text-sm text-gray-700">Grading Breakdown</h4>
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(gradingBreakdown).map(([category, percentage]) => (
        <div
          key={category}
          className="flex justify-between items-center p-2 bg-gray-50 rounded"
        >
          <span className="text-sm capitalize">{category}</span>
          <Badge variant="secondary">{percentage}%</Badge>
        </div>
      ))}
    </div>
  </div>
);

const AssignmentsList: React.FC<AssignmentsListProps> = ({
  assignments,
  title,
  icon,
}) => (
  <div className="space-y-3">
    <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
      {icon}
      {title} ({assignments.length})
    </h4>
    {assignments.length > 0 ? (
      <div className="space-y-2">
        {assignments.map((item, index) => (
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
                {moment(item.dueDate).format("MMM D, YYYY")}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500 italic">
        No {title.toLowerCase()} found
      </p>
    )}
  </div>
);

const ExamsList: React.FC<ExamsListProps> = ({ exams, title, icon }) => (
  <div className="space-y-3">
    <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
      {icon}
      {title} ({exams.length})
    </h4>
    {exams.length > 0 ? (
      <div className="space-y-2">
        {exams.map((item, index) => (
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
                {moment(item.date).format("MMM D, YYYY")}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500 italic">
        No {title.toLowerCase()} found
      </p>
    )}
  </div>
);

const ContactsList: React.FC<ContactsListProps> = ({ contacts }) => (
  <div className="space-y-3">
    <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
      <Users className="w-4 h-4" />
      Contacts ({contacts.length})
    </h4>
    {contacts.length > 0 ? (
      <div className="space-y-2">
        {contacts.map((contact, index) => (
          <div key={index} className="p-3 border rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h5 className="font-medium text-sm text-gray-900">
                  {contact.name}
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
                  <p className="text-xs text-gray-600">📞 {contact.phone}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500 italic">No contacts found</p>
    )}
  </div>
);

export const SyllabusProcessing: React.FC<SyllabusProcessingProps> = ({
  courseInstanceId,
  isSignedIn,
  isLoaded,
  showToast,
}) => {
  const {
    processingStatus,
    parsedData,
    isProcessing,
    processingError,
    isLoadingStatus,
    startProcessing,
    reprocess,
  } = useSyllabusProcessing({
    courseInstanceId,
    isSignedIn,
    isLoaded,
    showToast,
  });

  if (isLoadingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-gray-700">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
          <span>Loading syllabus status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!processingStatus?.exists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--custom-primary-color)]" />
            AI Syllabus Processing
          </CardTitle>
          <CardDescription>
            Upload a syllabus first to extract key information using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <FileText className="w-4 h-4 text-[var(--custom-primary-text-color)]" />
            <AlertDescription>
              Please upload a syllabus file first to enable AI processing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--custom-primary-color)]" />
            AI Syllabus Processing
          </CardTitle>
          <CardDescription>
            Extract key information from your syllabus using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Processing Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {processingStatus.isProcessed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : processingError ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : isProcessing ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : (
                <Brain className="w-5 h-5 text-[var(--custom-primary-color)]" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {processingStatus.isProcessed
                  ? "Processing Complete"
                  : processingError
                  ? "Processing Failed"
                  : isProcessing
                  ? "Processing..."
                  : "Ready to Process"}
              </span>
            </div>

            <div className="flex gap-2">
              {!processingStatus.isProcessed && !isProcessing && (
                <Button
                  onClick={startProcessing}
                  disabled={isProcessing}
                  size="sm"
                  className="cursor-pointer bg-[var(--custom-primary-color)] hover:bg-[var(--custom-hover-primary-color)] text-[var(--custom-primary-text-color)]"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="w-4 h-4 mr-2" />
                  )}
                  Start Processing
                </Button>
              )}

              {(processingStatus.isProcessed || processingError) && (
                <Button
                  onClick={reprocess}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reprocess
                </Button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {processingError && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{processingError}</AlertDescription>
            </Alert>
          )}

          {/* Processing Instructions */}
          {!processingStatus.isProcessed && !processingError && (
            <Alert variant="default">
              <Brain className="w-4 h-4 text-[var(--custom-primary-text-color)]" />
              <AlertDescription>
                Click &ldquo;Start Processing&rdquo; to extract grading
                breakdown, assignment dates, exam dates, and contact information
                from your syllabus using AI.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Parsed Data Display */}
      {processingStatus.isProcessed && parsedData && (
        <div className="space-y-6">
          {/* Calendar View */}
          <SyllabusCalendarView parsedData={parsedData} />

          {/* Existing Parsed Data Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Grading Breakdown */}
            {parsedData.gradingBreakdown &&
              Object.keys(parsedData.gradingBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[var(--custom-primary-color)]">
                      Grading Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GradingBreakdown
                      gradingBreakdown={parsedData.gradingBreakdown}
                    />
                  </CardContent>
                </Card>
              )}

            {/* Assignments */}
            {parsedData.assignmentDates &&
              parsedData.assignmentDates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[var(--custom-primary-color)]">
                      Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AssignmentsList
                      assignments={parsedData.assignmentDates}
                      title="Assignments"
                      icon={<FileText className="w-4 h-4 text-gray-600" />}
                    />
                  </CardContent>
                </Card>
              )}

            {/* Exams */}
            {parsedData.examDates && parsedData.examDates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[var(--custom-primary-color)]">
                    Exams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ExamsList
                    exams={parsedData.examDates}
                    title="Exams"
                    icon={<Calendar className="w-4 h-4 text-gray-600" />}
                  />
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            {parsedData.contacts && parsedData.contacts.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-[var(--custom-primary-color)]">
                    Course Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContactsList contacts={parsedData.contacts} />
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
      )}
    </div>
  );
};
