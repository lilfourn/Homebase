import CourseGoogleDriveImporter from "@/app/components/course/files/CourseGoogleDriveImporter.jsx";
import { Button } from "@/app/components/ui/button";
import {
  ParsedSyllabusData,
  SyllabusProcessingStatus,
} from "@/app/hooks/syllabus/useSyllabusProcessing";
import {
  LibraryTabProps as OriginalLibraryTabProps,
  SyllabusData,
  UserData,
} from "@/app/types/course.types";
import {
  Brain,
  CheckCircle,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { SyllabusPrompt } from "../ui/SyllabusPrompt";

// Extend the original props
export interface LibraryTabProps extends OriginalLibraryTabProps {
  course: any; // Replace with actual Course type
  userData: UserData | null;
  hasSyllabus: boolean | null;
  syllabusData: SyllabusData | null;
  showSyllabusModal: boolean;
  onShowSyllabusModal: () => void;
  processingStatus: SyllabusProcessingStatus | null;
  isProcessingAi: boolean; // Renamed to avoid conflict if isProcessing is already used
  startSyllabusProcessing: () => void;
  reprocessSyllabusAi: () => void;
  parsedData: ParsedSyllabusData | null;
  showToast?: (message: string, type: "success" | "error") => void;
}

export const LibraryTab = ({
  course,
  hasSyllabus,
  syllabusData,
  showSyllabusModal,
  userData,
  onShowSyllabusModal,
  processingStatus,
  isProcessingAi,
  startSyllabusProcessing,
  reprocessSyllabusAi,
}: LibraryTabProps) => {
  return (
    <div className="space-y-6">
      {/* Display Upload Syllabus button if no syllabus and modal was skipped */}
      {hasSyllabus === false && !showSyllabusModal && (
        <SyllabusPrompt onShowModal={onShowSyllabusModal} />
      )}

      {/* Display Syllabus information if it exists */}
      {hasSyllabus && syllabusData && (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Course Syllabus
                </h3>
                <p className="text-gray-700 text-sm font-medium mt-1">
                  {syllabusData.fileName}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                  <span>
                    Uploaded:{" "}
                    {new Date(syllabusData.uploadedAt).toLocaleDateString()}
                  </span>
                  {processingStatus?.isProcessed && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Analyzed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {syllabusData.webViewLink && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="cursor-pointer"
                >
                  <a
                    href={syllabusData.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Original
                  </a>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onShowSyllabusModal}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload New
              </Button>

              {!processingStatus?.isProcessed && !isProcessingAi && (
                <Button
                  size="sm"
                  onClick={startSyllabusProcessing}
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  Analyze with AI
                </Button>
              )}

              {processingStatus?.isProcessed && !isProcessingAi && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reprocessSyllabusAi}
                  className="cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Re-analyze
                </Button>
              )}

              {isProcessingAi && (
                <Button size="sm" disabled className="cursor-not-allowed">
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Analyzing...
                </Button>
              )}
            </div>
          </div>

          {/* Processing Status Message */}
          {processingStatus?.processingError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Analysis failed: {processingStatus.processingError}
                </p>
              </div>
            </div>
          )}

          {isProcessingAi && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-700">
                  AI is analyzing your syllabus. This may take a few moments...
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <CourseGoogleDriveImporter
        courseId={course?._id}
        isConnected={userData?.googleDrive?.connected || false}
      />
    </div>
  );
};
