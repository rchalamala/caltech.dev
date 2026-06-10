import "temporal-polyfill/global";
import { use, useEffect, useMemo } from "react";
import { AppState } from "./appContext";
import { parseTimes } from "./parseTimes";
import { createViewWeek, CalendarConfig } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { Temporal } from "temporal-polyfill";
import Flatpickr from "react-flatpickr";

import "@schedule-x/theme-default/dist/index.css";
import "flatpickr/dist/themes/airbnb.css";

import "./css/planner.css";

const hasWeekendCourse = false;

function CourseToDates(courses: CourseStorage[]): DateData[] {
  const dates: DateData[] = [];

  for (const course of courses) {
    if (course.sectionId === null) {
      continue;
    }

    const section = course.courseData.sections[course.sectionId];
    if (section.times === "A") {
      continue;
    }

    const days = parseTimes(section.times);
    for (const day of days) {
      if (day.length === 0) {
        continue;
      }
      for (const interval of day) {
        dates.push({
          id: course.courseData.id,
          title: course.courseData.number + " Section " + section.number,
          start: interval!.start,
          end: interval!.end,
          courseData: course.courseData,
        });
      }
    }
  }

  return dates;
}

const timeZone = Temporal.Now.timeZoneId();

function toZonedDateTime(date: Date): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.from({
    timeZone,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  });
}

/** Hashes id to proper colors for calendar items */
function courseColors(id: number) {
  const hue = ((id * 1.4269) % 1.0) * 360;
  const sat = (((id * 1.7234) % 0.2) + 0.5) * 100;

  return {
    main: `hsl(${hue}, ${sat}%, 70%)`,
    container: `hsl(${hue}, ${sat}%, 70%)`,
    onContainer: `hsl(${hue}, ${sat}%, 15%)`,
  };
}

function toExternalEvents(calEvents: DateData[]) {
  return calEvents.map((event, idx) => ({
    id: `${event.id}-${idx}`,
    title: event.title,
    start: toZonedDateTime(event.start),
    end: toZonedDateTime(event.end),
    calendarId: `course-${event.id}`,
  }));
}

function ScheduleCalendar({ calEvents }: { calEvents: DateData[] }) {
  const minHour =
    calEvents.length === 0
      ? 9
      : Math.min(...calEvents.map((event) => event.start.getHours()), 9);
  const maxHour =
    calEvents.length === 0
      ? 16
      : Math.max(...calEvents.map((event) => event.end.getHours() + 1), 16);

  const calendars: CalendarConfig["calendars"] = {};
  for (const event of calEvents) {
    const colors = courseColors(event.id);
    calendars[`course-${event.id}`] = {
      colorName: `course-${event.id}`,
      lightColors: colors,
      darkColors: colors,
    };
  }

  const eventsService = useMemo(() => createEventsServicePlugin(), []);

  const calendar = useCalendarApp({
    views: [createViewWeek()],
    selectedDate: Temporal.PlainDate.from("2018-01-01"),
    firstDayOfWeek: 1,
    dayBoundaries: {
      start: `${String(minHour).padStart(2, "0")}:00`,
      end: `${String(maxHour).padStart(2, "0")}:00`,
    },
    weekOptions: {
      nDays: hasWeekendCourse ? 7 : 5,
      gridHeight: 36 * (maxHour - minHour),
      eventOverlap: false,
    },
    calendars,
    events: toExternalEvents(calEvents),
    plugins: [eventsService],
  });

  useEffect(() => {
    eventsService.set(toExternalEvents(calEvents));
  }, [calEvents, eventsService]);

  return <ScheduleXCalendar calendarApp={calendar} />;
}

/** Calendar shown on left side of screen
 * Extends from `App.tsx` */
function Planner() {
  const state = use(AppState);

  const calEvents: DateData[] = CourseToDates(
    state.courses.filter((course) => course.enabled),
  );

  // remount the calendar only when its non-reactive config (day boundaries,
  // per-course color calendars) changes; event changes update in place
  const courseIds = [...new Set(calEvents.map((event) => event.id))].sort();
  const hours = calEvents.flatMap((event) => [
    event.start.getHours(),
    event.end.getHours() + 1,
  ]);
  const calendarKey =
    calEvents.length === 0
      ? "empty"
      : `${Math.min(...hours, 9)}-${Math.max(...hours, 16)}-${courseIds.join(",")}`;

  return (
    <div className="m-2.5">
      {/* first column mirrors the calendar's time-axis gutter so each picker
          sits exactly over its weekday column */}
      <div className="grid grid-cols-[var(--sx-calendar-week-grid-padding-left,75px)_repeat(5,1fr)] py-[5px]">
        {[0, 1, 2, 3, 4].map((idx) => {
          return (
            <div
              className={`flex flex-col items-center gap-y-2 ${idx === 0 ? "col-start-2" : ""}`}
              key={idx}
            >
              <Flatpickr
                data-enable-time
                options={{
                  dateFormat: "H:i",
                  enableTime: true,
                  noCalendar: true,
                }}
                value={state.availableTimes[idx][0]}
                onChange={([day]) => {
                  state.updateAvailableTimes(idx, true, day);
                }}
              />
              <Flatpickr
                data-enable-time
                options={{
                  dateFormat: "H:i",
                  enableTime: true,
                  noCalendar: true,
                }}
                value={state.availableTimes[idx][1]}
                onChange={([day]) => {
                  state.updateAvailableTimes(idx, false, day);
                }}
              />
            </div>
          );
        })}
      </div>
      <ScheduleCalendar key={calendarKey} calEvents={calEvents} />
    </div>
  );
}

export default Planner;
