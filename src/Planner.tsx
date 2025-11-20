import { useContext, useState, useRef } from "react";
import { AppState } from "./App";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg, EventChangeArg, DateSelectArg } from "@fullcalendar/core";

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

interface CustomBlock {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  editable: boolean;
}

function CourseToDates(courses: CourseStorage[]): EventInput[] {
  const dates: EventInput[] = [];

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
          start: interval!.start,
          end: interval!.end,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor,
          editable: false,
        });
      }
    }
  }

  return dates;
}

function Planner() {
  const state = useContext(AppState);
  const calendarRef = useRef<FullCalendar>(null);
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);
  const [blockIdCounter, setBlockIdCounter] = useState(0);

  const courseEvents: EventInput[] = CourseToDates(
    state.courses.filter((course) => course.enabled),
  );

  const customBlockEvents: EventInput[] = customBlocks.map((block) => ({
    id: block.id,
    title: block.title,
    start: block.start,
    end: block.end,
    backgroundColor: block.backgroundColor || "#3788d8",
    borderColor: block.borderColor || "#3788d8",
    editable: block.editable,
  }));

  const allEvents = [...courseEvents, ...customBlockEvents];

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt("Enter block title:");
    if (title) {
      const newBlock: CustomBlock = {
        id: `custom-${blockIdCounter}`,
        title: title,
        start: selectInfo.start,
        end: selectInfo.end,
        backgroundColor: "#3788d8",
        borderColor: "#3788d8",
        editable: true,
      };
      setCustomBlocks([...customBlocks, newBlock]);
      setBlockIdCounter(blockIdCounter + 1);
    }
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (clickInfo.event.id.startsWith("custom-")) {
      if (confirm(`Delete block '${clickInfo.event.title}'?`)) {
        setCustomBlocks(
          customBlocks.filter((block) => block.id !== clickInfo.event.id)
        );
      }
    }
  };

  const handleEventChange = (changeInfo: EventChangeArg) => {
    if (changeInfo.event.id.startsWith("custom-")) {
      setCustomBlocks(
        customBlocks.map((block) => {
          if (block.id === changeInfo.event.id) {
            return {
              ...block,
              start: changeInfo.event.start!,
              end: changeInfo.event.end!,
            };
          }
          return block;
        })
      );
    }
  };

  return (
    <div>
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:15:00"
        snapDuration="00:15:00"
        height="auto"
        editable={true}
        selectable={true}
        selectMirror={true}
        dayHeaderFormat={{ weekday: "short" }}
        slotLabelFormat={{
          hour: "numeric",
          minute: "2-digit",
          omitZeroMinute: true,
          meridiem: "short",
        }}
        weekends={false}
        events={allEvents}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventChange={handleEventChange}
        eventResizableFromStart={true}
        initialDate={new Date(2018, 0, 1)}
      />
    </div>
  );
}

export default Planner;
