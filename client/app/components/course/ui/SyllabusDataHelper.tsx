import { AlertCircle } from "lucide-react";

interface SyllabusDataHelperProps {
  hasData: boolean;
  dataType: "grading" | "assignments" | "exams" | "contacts";
}

export const SyllabusDataHelper: React.FC<SyllabusDataHelperProps> = ({
  hasData,
  dataType,
}) => {
  if (hasData) return null;

  const messages = {
    grading: "No grading breakdown found. Click 'Edit Data' to add grading categories and their weights.",
    assignments: "No assignments found. Click 'Edit Data' to add assignments with due dates.",
    exams: "No exams found. Click 'Edit Data' to add exam dates and details.",
    contacts: "No course contacts found. Click 'Edit Data' to add instructor and TA information.",
  };

  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">{messages[dataType]}</p>
    </div>
  );
};