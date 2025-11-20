import { format, getDay, parse, startOfWeek } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { useContext } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import Flatpickr from "react-flatpickr";
import { AppState } from "./App";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "flatpickr/dist/themes/airbnb.css";

import "./css/planner.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
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
  const times_clean = times.replace("\nA", "");
  console.log(times_clean);

  for (const line of times_clean.split(/[,\n]/)) {
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

/** Calendar shown on left side of screen
 * Extends from `App.tsx` */
function Planner() {
  const state = useContext(AppState);

  const calEvents: DateData[] = CourseToDates(
    state.courses.filter((course) => course.enabled),
  );

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

  return (
    <div>
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
      <Calendar
        localizer={localizer}
        formats={{
          timeGutterFormat: "h a",
          eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
            localizer!.format(start, "h:mm a", culture) +
            " - " +
            localizer!.format(end, "h:mm a", culture),
          eventTimeRangeStartFormat: ({ start }, culture, localizer) =>
            localizer!.format(start, "h:mm a", culture),
          eventTimeRangeEndFormat: ({ end }, culture, localizer) =>
            localizer!.format(end, "h:mm a", culture),
          dayFormat: "EEE",
          dayHeaderFormat: "EEEE MMM dd",
          dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
            localizer!.format(start, "MMM dd", culture) +
            " - " +
            localizer!.format(end, "MMM dd", culture),
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
