import { useContext } from "react";
import { AppState } from "./App";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import Flatpickr from "react-flatpickr";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "flatpickr/dist/themes/material_orange.css";

const localizer = momentLocalizer(moment);
const hasWeekendCourse = false;
const WEEKDAY_INDICES: WeekdayIndex[] = [0, 1, 2, 3, 4];
const DAY_TO_INDEX: Record<string, WeekdayIndex> = {
  M: 0,
  T: 1,
  W: 2,
  R: 3,
  F: 4,
};

function CourseToDates(courses: CourseStorage[]): DateData[] {
  const dates: DateData[] = [];

  for (const course of courses) {
    if (course.sectionId === null) {
      continue;
    }

    const section = course.courseData.sections[course.sectionId];
    if (section === undefined) {
      continue;
    }

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
          start: interval.start,
          end: interval.end,
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
type ParsedTimes = [
  TimeInterval[],
  TimeInterval[],
  TimeInterval[],
  TimeInterval[],
  TimeInterval[],
];

export function parseTimes(times: string): ParsedTimes {
  const ret: ParsedTimes = [[], [], [], [], []];

  // super hacky fix for a parsing bug when location is A
  const timesClean = times.replace("\nA", "");

  for (const line of timesClean.split(/[,\n]/)) {
    const match = line.match(/([MTWRF]+) (\d\d):(\d\d) - (\d\d):(\d\d)/);
    if (match !== null) {
      const [days, startHour, startMinute, endHourRaw, endMinute] = match.slice(
        1,
      );
      if (
        days === undefined ||
        startHour === undefined ||
        startMinute === undefined ||
        endHourRaw === undefined ||
        endMinute === undefined
      ) {
        continue;
      }
      const parsedEndHour = Number.parseInt(endHourRaw, 10);

      //  An example match: [ "MWF 14:00 - 14:55", "MWF", "14", "00", "14", "55" ]
      for (const day of days) {
        const dayIndex = DAY_TO_INDEX[day];
        if (dayIndex === undefined) {
          continue;
        }

        ret[dayIndex].push({
          start: new Date(
            2018,
            0,
            dayIndex + 1,
            Number.parseInt(startHour, 10),
            Number.parseInt(startMinute, 10),
          ),
          end: new Date(
            2018,
            0,
            dayIndex + 1,
            parsedEndHour === 23 ? 11 : parsedEndHour,
            Number.parseInt(endMinute, 10),
          ),
        });
      }
    }
  }
  return ret;
}

/** Hashes id to proper color and styling for calendar items */
const eventStyleGetter = (event: DateData) => {
  const hue = ((event.id * 1.4269) % 1.0) * 360;
  const sat = (((event.id * 1.7234) % 0.2) + 0.5) * 100;

  return {
    style: {
      backgroundColor: `hsl(${hue}, ${sat}%, 70%)`,
      cursor: "pointer",
      borderStyle: "none",
      borderRadius: "4px",
    },
  };
};

/** Calendar shown on left side of screen
 * Extends from `App.tsx` */
function Planner() {
  const state = useContext(AppState);

  const calEvents: DateData[] = CourseToDates(
    state.courses.filter((course) => course.enabled),
  );

  return (
    <div>
      <div className="ml-[65px] mr-5 flex justify-around py-1">
        {WEEKDAY_INDICES.map((idx) => {
          const [startTime, endTime] = state.availableTimes[idx];
          return (
            <div className="flex max-w-16 flex-col gap-2" key={idx}>
              <Flatpickr
                className="rounded border border-neutral-300 text-center"
                data-enable-time
                options={{
                  dateFormat: "H:i",
                  enableTime: true,
                  noCalendar: true,
                }}
                value={startTime}
                onChange={([day]) => {
                  if (day !== undefined) {
                    state.updateAvailableTimes(idx, true, day);
                  }
                }}
              />
              <Flatpickr
                className="rounded border border-neutral-300 text-center"
                data-enable-time
                options={{
                  dateFormat: "H:i",
                  enableTime: true,
                  noCalendar: true,
                }}
                value={endTime}
                onChange={([day]) => {
                  if (day !== undefined) {
                    state.updateAvailableTimes(idx, false, day);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      <Calendar
        localizer={localizer}
        formats={{
          timeGutterFormat: (date, culture, calendarLocalizer) =>
            date.getMinutes() > 0
              ? ""
              : (calendarLocalizer?.format(date, "h A", culture) ?? ""),
          dayFormat: "ddd",
        }}
        views={[Views.WEEK, Views.WORK_WEEK]}
        view={hasWeekendCourse ? Views.WEEK : Views.WORK_WEEK}
        onView={() => {}}
        step={15}
        timeslots={2}
        defaultDate={new Date(2018, 0, 1)}
        min={
          new Date(
            2018,
            0,
            1,
            calEvents.length === 0
              ? 9
              : Math.min(
                  calEvents
                    .reduce((prev, curr) =>
                      curr.start.getHours() < prev.start.getHours()
                        ? curr
                        : prev,
                    )
                    .start.getHours(),
                  9,
                ),
          )
        }
        max={
          new Date(
            2018,
            0,
            1,
            calEvents.length === 0
              ? 16
              : Math.max(
                  calEvents
                    .reduce((prev, curr) =>
                      curr.end.getHours() > prev.end.getHours() ? curr : prev,
                    )
                    .end.getHours() + 1,
                  16,
                ),
          )
        }
        toolbar={false}
        events={calEvents}
        startAccessor="start"
        endAccessor="end"
        style={{
          margin: "10px",
        }}
        eventPropGetter={eventStyleGetter}
      />
    </div>
  );
}

export default Planner;
