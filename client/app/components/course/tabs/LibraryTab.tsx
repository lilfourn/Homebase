import CourseGoogleDriveImporter from "@/app/components/course/files/CourseGoogleDriveImporter.jsx";
import { Button } from "@/app/components/ui/button";
import { SyllabusProcessingStatus } from "@/app/hooks/useSyllabusProcessing";
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
  const canProcess =
    hasSyllabus &&
    syllabusData &&
    !processingStatus?.isProcessed &&
    !processingStatus?.processingError;
  const canReprocess =
    hasSyllabus &&
    syllabusData &&
    (processingStatus?.isProcessed || processingStatus?.processingError);

  return (
    <div className="space-y-6">
      {/* Display Upload Syllabus button if no syllabus and modal was skipped */}
      {hasSyllabus === false && !showSyllabusModal && (
        <SyllabusPrompt onShowModal={onShowSyllabusModal} />
      )}

      {/* Display Syllabus information if it exists */}
      {hasSyllabus && syllabusData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-3 mb-3 sm:mb-0">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">
                  Course Syllabus
                </h3>
                <p className="text-green-600 text-sm">
                  {syllabusData.fileName}
                </p>
                <p className="text-green-500 text-xs">
                  Uploaded:{" "}
                  {new Date(syllabusData.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-start sm:self-center">
              {syllabusData.webViewLink && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="cursor-pointer border-green-300 text-green-700 hover:bg-green-100"
                >
                  <a
                    href={syllabusData.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onShowSyllabusModal}
                className="cursor-pointer border-green-300 text-green-700 hover:bg-green-100"
              >
                Replace
              </Button>
            </div>
          </div>

          {/* AI Processing Section */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-blue-600" />
              AI Syllabus Analysis
            </h4>
            {processingStatus ? (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2 text-sm">
                  {isProcessingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : processingStatus.isProcessed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : processingStatus.processingError ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Brain className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="flex-1 min-w-0 break-words text-gray-700">
                    {isProcessingAi
                      ? "Processing..."
                      : processingStatus.isProcessed
                      ? "Successfully Analyzed"
                      : processingStatus.processingError
                      ? `Error: ${processingStatus.processingError.substring(
                          0,
                          50
                        )}${
                          processingStatus.processingError.length > 50
                            ? "..."
                            : ""
                        }`
                      : "Ready to Analyze"}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  {canProcess && !isProcessingAi && (
                    <Button
                      size="sm"
                      onClick={startSyllabusProcessing}
                      className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Brain className="w-4 h-4 mr-1" /> Analyze Syllabus
                    </Button>
                  )}
                  {canReprocess && !isProcessingAi && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reprocessSyllabusAi}
                      className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Re-analyze
                    </Button>
                  )}
                  {isProcessingAi && (
                    <Button
                      size="sm"
                      disabled
                      className="cursor-not-allowed bg-gray-200 text-gray-500"
                    >
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />{" "}
                      Processing...
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-gray-600">
                  Loading analysis status...
                </span>
                <Button
                  size="sm"
                  onClick={startSyllabusProcessing}
                  disabled={isProcessingAi}
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isProcessingAi ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Brain className="w-4 h-4 mr-1" />
                  )}
                  Analyze Syllabus
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <CourseGoogleDriveImporter
        courseId={course?._id}
        isConnected={userData?.googleDrive?.connected || false}
      />
    </div>
  );
};
