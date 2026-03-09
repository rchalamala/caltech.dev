import { useContext } from "react";
import { AppState } from "./App";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import Flatpickr from "react-flatpickr";
import { parseTimes } from "./lib/time";
import { CourseStorage, DateData } from "./types";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "flatpickr/dist/themes/airbnb.css";

import "./css/planner.css";

const localizer = momentLocalizer(moment);
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
        if (!interval) {
          continue;
        }
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
          timeGutterFormat: (date, culture, localizer) =>
            date.getMinutes() > 0
              ? ""
              : localizer!.format(date, "h A", culture),
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
