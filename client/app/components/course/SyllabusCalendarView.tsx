"use client";

import { ParsedSyllabusData } from "@/app/hooks/syllabus/useSyllabusProcessing";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
} from "lucide-react";
import moment from "moment";
import { useState } from "react";
import {
  Calendar as BigCalendar,
  Event,
  momentLocalizer,
  View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface SyllabusCalendarEvent extends Event {
  title: string;
  start: Date;
  end: Date;
  type: "assignment" | "exam";
  description?: string;
  allDay?: boolean;
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

interface SyllabusCalendarProps {
  parsedData: ParsedSyllabusData | null;
}

export const SyllabusCalendarView: React.FC<SyllabusCalendarProps> = ({
  parsedData,
}) => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const navigatePrevious = () => {
    const newDate = moment(date)
      .subtract(1, view as moment.unitOfTime.DurationConstructor)
      .toDate();
    setDate(newDate);
  };

  const navigateNext = () => {
    const newDate = moment(date)
      .add(1, view as moment.unitOfTime.DurationConstructor)
      .toDate();
    setDate(newDate);
  };

  const navigateToday = () => {
    setDate(new Date());
  };

  const formatDateLabel = () => {
    switch (view) {
      case "month":
        return moment(date).format("MMMM YYYY");
      case "week":
        return `Week of ${moment(date).startOf("week").format("MMM D, YYYY")}`;
      case "agenda":
        return moment(date).format("MMMM YYYY");
      default:
        return moment(date).format("MMMM YYYY");
    }
  };

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

  // Process and validate dates
  const assignmentEvents: SyllabusCalendarEvent[] = (
    parsedData.assignmentDates || []
  )
    .filter((item) => {
      // Validate that we have a valid date
      const isValidDate = item.dueDate && moment(item.dueDate).isValid();
      if (!isValidDate) {
        console.warn("Invalid assignment date found:", item);
        return false;
      }
      return true;
    })
    .map((item) => {
      const eventDate = moment(item.dueDate);
      return {
        start: eventDate.toDate(),
        end: eventDate.clone().add(1, "hour").toDate(), // Add 1 hour duration for better visibility
        title: `📝 ${item.title}`,
        type: "assignment" as const,
        description: item.description,
        allDay: true,
      };
    });

  const examEvents: SyllabusCalendarEvent[] = (parsedData.examDates || [])
    .filter((item) => {
      // Validate that we have a valid date
      const isValidDate = item.date && moment(item.date).isValid();
      if (!isValidDate) {
        console.warn("Invalid exam date found:", item);
        return false;
      }
      return true;
    })
    .map((item) => {
      const eventDate = moment(item.date);
      return {
        start: eventDate.toDate(),
        end: eventDate.clone().add(2, "hours").toDate(), // Add 2 hours duration for exams
        title: `🎓 ${item.title}`,
        type: "exam" as const,
        description: item.description,
        allDay: true,
      };
    });

  const allEvents: SyllabusCalendarEvent[] = [
    ...assignmentEvents,
    ...examEvents,
  ];

  // Debug logging
  console.log("Parsed syllabus data:", parsedData);
  console.log("Assignment events:", assignmentEvents);
  console.log("Exam events:", examEvents);
  console.log("All events:", allEvents);

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
              No assignments or exams with valid dates found in the syllabus to
              display on the calendar.
              {parsedData.assignmentDates?.length > 0 && (
                <div className="mt-2 text-xs">
                  Found {parsedData.assignmentDates.length} assignments but with
                  invalid dates.
                </div>
              )}
              {parsedData.examDates?.length > 0 && (
                <div className="mt-1 text-xs">
                  Found {parsedData.examDates.length} exams but with invalid
                  dates.
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const eventStyleGetter = (event: SyllabusCalendarEvent) => {
    let backgroundColor = event.type === "assignment" ? "#3b82f6" : "#ef4444";
    let borderColor = event.type === "assignment" ? "#1d4ed8" : "#dc2626";

    return {
      style: {
        backgroundColor: backgroundColor,
        borderRadius: "6px",
        opacity: 0.9,
        color: "white",
        border: `2px solid ${borderColor}`,
        display: "block",
        fontSize: "12px",
        fontWeight: "500",
        padding: "2px 6px",
      },
    };
  };

  const EventComponent = ({ event }: { event: SyllabusCalendarEvent }) => (
    <div className="font-medium text-xs">{event.title}</div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Syllabus Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Events Summary */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {assignmentEvents.length} Assignments
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {examEvents.length} Exams
                </span>
              </div>
            </div>
            <Badge variant="outline">{allEvents.length} Total Events</Badge>
          </div>
        </div>

        {/* Custom Navigation Controls */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={navigateToday}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {formatDateLabel()}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {["month", "week", "agenda"].map((viewType) => (
              <button
                key={viewType}
                onClick={() => setView(viewType as View)}
                className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${
                  view === viewType
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </button>
            ))}
          </div>
        </div>

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
            components={{
              event: EventComponent,
            }}
            tooltipAccessor={(event) => {
              const calEvent = event as SyllabusCalendarEvent;
              return `${calEvent.title}${
                calEvent.description
                  ? `\nDescription: ${calEvent.description}`
                  : ""
              }\nDate: ${moment(calEvent.start).format("MMMM Do, YYYY")}`;
            }}
            views={["month", "week", "agenda"]}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            popup
            className="text-sm syllabus-calendar"
            toolbar={false} // Disable default toolbar since we're using custom controls
            messages={{
              allDay: "All Day",
              previous: "Previous",
              next: "Next",
              today: "Today",
              month: "Month",
              week: "Week",
              agenda: "Agenda",
              noEventsInRange: "No events in this range",
            }}
          />
        </div>
        <style jsx global>{`
          .rbc-event {
            padding: 3px 6px;
            font-size: 0.75em;
            font-weight: 500;
            border-radius: 6px;
          }
          .rbc-event-content {
            font-weight: 500;
          }
          .rbc-agenda-date-cell,
          .rbc-agenda-time-cell,
          .rbc-agenda-event-cell {
            padding: 8px 5px;
          }
          .rbc-header {
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
            font-weight: 600;
            padding: 8px 4px;
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
            background-color: #f9fafb;
          }
          .rbc-today {
            background-color: #dbeafe;
          }
          .rbc-date-cell {
            padding: 8px 4px;
          }
          .rbc-month-view .rbc-event {
            margin: 1px 2px;
          }
          .rbc-agenda-view .rbc-event {
            border-radius: 4px;
            padding: 4px 8px;
          }
        `}</style>
      </CardContent>
    </Card>
  );
};
