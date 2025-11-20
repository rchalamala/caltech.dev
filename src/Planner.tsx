import { useContext, useState, useEffect } from "react";
import { AppState } from "./App";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import { createViewWeek } from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createResizePlugin } from "@schedule-x/resize";
import "@schedule-x/theme-default/dist/index.css";
import { useModal } from "./Modal";
import { Temporal } from "temporal-polyfill";

import "./css/planner.css";

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

function dateToTemporalZDT(date: Date): any {
  const tz = Temporal.Now.timeZoneId();
  return Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(tz);
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
          start: dateToTemporalZDT(interval!.start),
          end: dateToTemporalZDT(interval!.end),
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
  const [blockTitle, setBlockTitle] = useState("");
  const [pendingBlock, setPendingBlock] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const calendar = useCalendarApp({
    views: [createViewWeek()],
    defaultView: "week",
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
          const startDate = typeof updatedEvent.start === 'string'
            ? new Date(updatedEvent.start.replace(' ', 'T'))
            : new Date(updatedEvent.start.toInstant().epochMilliseconds);
          const endDate = typeof updatedEvent.end === 'string'
            ? new Date(updatedEvent.end.replace(' ', 'T'))
            : new Date(updatedEvent.end.toInstant().epochMilliseconds);
          state.updateCustomBlock(updatedEvent.id, {
            start: startDate,
            end: endDate,
          });
        }
      },
      onClickDateTime(dateTime: any) {
        const ms = dateTime.toInstant().epochMilliseconds;
        const clickedDate = new Date(ms);
        const endDate = new Date(ms + 60 * 60 * 1000);
        setPendingBlock({ start: clickedDate, end: endDate });
        openModal();
      },
    },
  }, [createDragAndDropPlugin(), createResizePlugin()]);

  const courseEvents = CourseToDates(
    state.courses.filter((course) => course.enabled)
  );

  const customBlockEvents = (state.customBlocks || []).map((block) => ({
    id: block.id,
    title: block.title,
    start: dateToTemporalZDT(block.start),
    end: dateToTemporalZDT(block.end),
    calendarId: "blocks",
  }));

  useEffect(() => {
    if (calendar) {
      const allEvents = [...courseEvents, ...customBlockEvents];
      console.log('Setting events:', allEvents);
      calendar.events.set(allEvents);
    }
  }, [state.courses, state.customBlocks, calendar]);

  const [openModal, modal] = useModal((props) => (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Create Time Block</h2>
      <input
        type="text"
        placeholder="Enter block title"
        value={blockTitle}
        onChange={(e) => setBlockTitle(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (blockTitle.trim() && pendingBlock) {
              state.addCustomBlock({
                title: blockTitle.trim(),
                start: pendingBlock.start,
                end: pendingBlock.end,
              });
              setBlockTitle("");
              setPendingBlock(null);
              props.onClose();
            }
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
        >
          Create
        </button>
        <button
          onClick={() => {
            setBlockTitle("");
            setPendingBlock(null);
            props.onClose();
          }}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  ));

  return (
    <div>
      {modal}
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}

export default Planner;
