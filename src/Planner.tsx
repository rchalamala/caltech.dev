import "temporal-polyfill/global";
import { useContext, useEffect, useMemo } from "react";
import { AppState } from "./App";
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

type TimeInterval = {
  start: Date;
  end: Date;
};

export function parseTimes(times: string): Maybe<TimeInterval>[][] {
  const ret: Maybe<TimeInterval>[][] = [[], [], [], [], []];
  const day_to_i = ["M", "T", "W", "R", "F"]; // TODO: Include Sat/Sun Courses, OM Courses

  // super hacky fix for a parsing bug when location is A
  let times_clean = times.replace("\nA", "");
  console.log(times_clean);

  for (let line of times_clean.split(/[,\n]/)) {
    const match = line.match(/([MTWRF]+) (\d\d):(\d\d) - (\d\d):(\d\d)/);
    if (match !== null) {
      //  An example match: [ "MWF 14:00 - 14:55", "MWF", "14", "00", "14", "55" ]
      for (const day of match[1]) {
        ret[day_to_i.indexOf(day)].push({
          start: new Date(
            2018,
            0,
            day_to_i.indexOf(day) + 1,
            parseInt(match[2]),
            parseInt(match[3]),
          ),
          end: new Date(
            2018,
            0,
            day_to_i.indexOf(day) + 1,
            // stupid hacky thing to avoid crashing when time is entered incorrectly in catalog (11pm instead of 11am)
            parseInt(match[4]) === 23 ? 11 : parseInt(match[4]),
            parseInt(match[5]),
          ),
        });
      }
    }
  }
  return ret;
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
  const state = useContext(AppState);

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
    <div className="planner">
      <div className="time-controls">
        {[0, 1, 2, 3, 4].map((idx) => {
          return (
            <div className="time-picker" key={idx}>
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
