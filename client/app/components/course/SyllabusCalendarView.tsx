"use client";

import { ParsedSyllabusData } from "@/app/hooks/useSyllabusProcessing";
import { CalendarIcon, FileText } from "lucide-react";
import moment from "moment";
import {
  Calendar as BigCalendar,
  Event,
  momentLocalizer,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface SyllabusCalendarEvent extends Event {
  title?: string;
  type: "assignment" | "exam";
  description?: string;
}

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

const Alert: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}> = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "border-blue-200 bg-blue-50 text-blue-900",
    destructive: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div
      className={`border rounded-lg p-4 flex items-start gap-3 ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="text-sm">{children}</div>;

interface SyllabusCalendarProps {
  parsedData: ParsedSyllabusData | null;
}

export const SyllabusCalendarView: React.FC<SyllabusCalendarProps> = ({
  parsedData,
}) => {
  if (!parsedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Syllabus Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CalendarIcon className="w-4 h-4" />
            <AlertDescription>
              Syllabus data not available to display calendar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const assignmentEvents: SyllabusCalendarEvent[] = (
    parsedData.assignmentDates || []
  ).map((item) => ({
    start: moment(item.dueDate).toDate(),
    end: moment(item.dueDate).toDate(),
    title: `Assignment: ${item.title}`,
    type: "assignment",
    description: item.description,
  }));

  const examEvents: SyllabusCalendarEvent[] = (parsedData.examDates || []).map(
    (item) => ({
      start: moment(item.date).toDate(),
      end: moment(item.date).toDate(),
      title: `Exam: ${item.title}`,
      type: "exam",
      description: item.description,
    })
  );

  const allEvents: SyllabusCalendarEvent[] = [
    ...assignmentEvents,
    ...examEvents,
  ];

  if (allEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Syllabus Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CalendarIcon className="w-4 h-4" />
            <AlertDescription>
              No assignments or exams with dates found in the syllabus to
              display on the calendar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const eventStyleGetter = (event: SyllabusCalendarEvent) => {
    let backgroundColor = event.type === "assignment" ? "#3b82f6" : "#ef4444";
    let style = {
      backgroundColor: backgroundColor,
      borderRadius: "5px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    };
    return {
      style: style,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Syllabus Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{ height: "600px" }}
          className="rounded-lg border p-4 bg-white"
        >
          <BigCalendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            eventPropGetter={eventStyleGetter}
            tooltipAccessor={(event) => {
              const calEvent = event as SyllabusCalendarEvent;
              return `${calEvent.title}${
                calEvent.description
                  ? `\nDescription: ${calEvent.description}`
                  : ""
              }`;
            }}
            views={["month", "week", "agenda"]}
            popup
            className="text-sm syllabus-calendar"
          />
        </div>
        <style jsx global>{`
          .rbc-event {
            padding: 2px 5px;
            font-size: 0.8em;
          }
          .rbc-agenda-date-cell,
          .rbc-agenda-time-cell,
          .rbc-agenda-event-cell {
            padding: 5px 0;
          }
          .rbc-toolbar button {
            background-color: #e5e7eb;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 0.375rem 0.75rem;
            border-radius: 0.375rem;
            margin: 0 2px;
            cursor: pointer;
          }
          .rbc-toolbar button:hover {
            background-color: #d1d5db;
          }
          .rbc-toolbar button.rbc-active {
            background-color: #3b82f6;
            color: white;
          }
          .rbc-toolbar .rbc-toolbar-label {
            font-size: 1.1em;
            font-weight: bold;
            color: #1f2937;
          }
          .rbc-header {
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
          }
          .rbc-day-bg {
            border-left: 1px solid #e5e7eb;
          }
          .rbc-month-row {
            border-bottom: 1px solid #e5e7eb;
          }
          .rbc-time-gutter,
          .rbc-timeslot-group {
            border-right: 1px solid #e5e7eb;
          }
          .rbc-time-header-gutter .rbc-header,
          .rbc-time-header-content .rbc-header {
            border-bottom: 1px solid #e5e7eb;
          }
          .rbc-off-range-bg {
            background-color: #f3f4f6; /* Light gray for off-range days */
          }
          .rbc-today {
            background-color: #e0e7ff; /* Light blue for today */
          }
        `}</style>
      </CardContent>
    </Card>
  );
};
