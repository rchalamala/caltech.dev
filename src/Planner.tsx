import { useContext, useEffect } from "react";
import { AppState } from "./App";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { createViewWeek } from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createResizePlugin } from "@schedule-x/resize";
import "@schedule-x/theme-default/dist/index.css";
import { Temporal } from "temporal-polyfill";

import "./css/planner.css";

const TZ = Temporal.Now.timeZoneId();
const REF_MONDAY = Temporal.ZonedDateTime.from(`2018-01-01T00:00[${TZ}]`);

type TimeInterval = {
  start: Date;
  end: Date;
};

export function parseTimes(times: string): Maybe<TimeInterval>[][] {
  const ret: Maybe<TimeInterval>[][] = [[], [], [], [], []];
  const day_to_i = ["M", "T", "W", "R", "F"];

  let times_clean = times.replace("\nA", "");
  console.log(times_clean);

  for (let line of times_clean.split(/[,\n]/)) {
    const match = line.match(/([MTWRF]+) (\d\d):(\d\d) - (\d\d):(\d\d)/);
    if (match !== null) {
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
            parseInt(match[4]) === 23 ? 11 : parseInt(match[4]),
            parseInt(match[5]),
          ),
        });
      }
    }
  }
  return ret;
}

function dateToRefWeekZDT(date: Date): any {
  const zdt = Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(TZ);
  const dayOfWeek = zdt.dayOfWeek;
  return REF_MONDAY.add({ days: dayOfWeek - 1 }).with({
    hour: zdt.hour,
    minute: zdt.minute,
    second: 0,
    millisecond: 0,
  });
}

function CourseToDates(courses: CourseStorage[]) {
  const dates: any[] = [];

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
        const hue = ((course.courseData.id * 1.4269) % 1.0) * 360;
        const sat = (((course.courseData.id * 1.7234) % 0.2) + 0.5) * 100;
        const backgroundColor = `hsl(${hue}, ${sat}%, 70%)`;

        dates.push({
          id: `course-${course.courseData.id}-${interval!.start.getTime()}`,
          title: course.courseData.number + " Section " + section.number,
          start: dateToRefWeekZDT(interval!.start),
          end: dateToRefWeekZDT(interval!.end),
          calendarId: "courses",
          _customData: {
            backgroundColor: backgroundColor,
            editable: false,
          },
        });
      }
    }
  }

  return dates;
}

function Planner() {
  const state = useContext(AppState);

  const calendar = useCalendarApp({
    views: [createViewWeek()],
    defaultView: "week",
    selectedDate: Temporal.PlainDate.from("2018-01-01"),
    weekOptions: {
      gridHeight: 800,
      nDays: 5,
    },
    calendars: {
      courses: {
        colorName: "courses",
        lightColors: {
          main: "#1c7df9",
          container: "#d2e7ff",
          onContainer: "#002859",
        },
      },
      blocks: {
        colorName: "blocks",
        lightColors: {
          main: "#3788d8",
          container: "#d2e7ff",
          onContainer: "#002859",
        },
      },
    },
    callbacks: {
      onEventClick(calendarEvent: any) {
        if (calendarEvent.id.startsWith("custom-")) {
          if (confirm(`Delete block '${calendarEvent.title}'?`)) {
            state.removeCustomBlock(calendarEvent.id);
          }
        }
      },
      onEventUpdate(updatedEvent: any) {
        if (updatedEvent.id.startsWith("custom-")) {
          const startZDT = typeof updatedEvent.start === 'string'
            ? Temporal.ZonedDateTime.from(updatedEvent.start.replace(' ', 'T') + `[${TZ}]`)
            : updatedEvent.start;
          const endZDT = typeof updatedEvent.end === 'string'
            ? Temporal.ZonedDateTime.from(updatedEvent.end.replace(' ', 'T') + `[${TZ}]`)
            : updatedEvent.end;
          const startDate = new Date(startZDT.toInstant().epochMilliseconds);
          const endDate = new Date(endZDT.toInstant().epochMilliseconds);
          state.updateCustomBlock(updatedEvent.id, {
            start: startDate,
            end: endDate,
          });
        }
      },
      onClickDateTime(dateTime: any) {
        const clickedZDT = dateTime as any;
        const dayOfWeek = clickedZDT.dayOfWeek;
        const refStart = REF_MONDAY.add({ days: dayOfWeek - 1 }).with({
          hour: clickedZDT.hour,
          minute: clickedZDT.minute,
          second: 0,
          millisecond: 0,
        });
        const refEnd = refStart.add({ hours: 1 });
        const startDate = new Date(refStart.toInstant().epochMilliseconds);
        const endDate = new Date(refEnd.toInstant().epochMilliseconds);
        
        state.addCustomBlock({
          title: "New Block",
          start: startDate,
          end: endDate,
        });
      },
    },
  }, [createDragAndDropPlugin(), createResizePlugin()]);

  const courseEvents = CourseToDates(
    state.courses.filter((course) => course.enabled)
  );

  const customBlockEvents = (state.customBlocks || []).map((block) => ({
    id: block.id,
    title: block.title,
    start: dateToRefWeekZDT(block.start),
    end: dateToRefWeekZDT(block.end),
    calendarId: "blocks",
  }));

  useEffect(() => {
    if (calendar) {
      const allEvents = [...courseEvents, ...customBlockEvents];
      calendar.events.set(allEvents);
    }
  }, [state.courses, state.customBlocks, calendar]);

  return (
    <div>
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}

export default Planner;
