import TERM_START_DATES from "../data/term_start_dates.json";
import { CourseStorage } from "../types";

// Map weekdays to indices for easy comparison
const dayMap = "MTWRFSU";

// Helper function to get the first occurrence of a day after the term start date
function getFirstOccurrence(startDate: Date, dayOfWeek: string, timeString: string): Date {
  const date = new Date(startDate); // Copy the term start date
  const targetDay = dayMap.indexOf(dayOfWeek) + 1; // Get index for the weekday
  const currentDay = date.getDay();

  // Move the date to the first occurrence of the target weekday
  const dayOffset = (targetDay - currentDay + 7) % 7;
  date.setDate(date.getDate() + dayOffset); // Ensure we don't return the start date if it's the same day

  // Parse time (e.g., "09:00") and set the time explicitly using local time
  const [hours, minutes] = timeString.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0); // Set hours and minutes in the local timezone
  
  return date;
}

function formatICSDate(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function getEventUid(
  event: {
    name: string;
    location: string;
    startTime: Date;
    endTime: Date;
  },
  term: string,
  index: number,
): string {
  return [
    term,
    event.name,
    event.location,
    formatICSDate(event.startTime),
    formatICSDate(event.endTime),
    index,
  ]
    .join("-")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .toLowerCase();
}

export function exportICS(term: string, courses: CourseStorage[]): string {
  const [termStartYear, termStartMonth, termStartDay] = (
    TERM_START_DATES as { [key: string]: string }
  )[term]
    .split("-")
    .map(Number);
  const termStartDate = new Date(
    termStartYear,
    termStartMonth - 1,
    termStartDay,
  );

  // Flatten the courses and parse times with start and end times, matching locations
  const parsedEvents = courses
    .filter(course => course.enabled)
    .flatMap(course => {
      return course.courseData.sections
        .filter(section => section.number - 1 === course.sectionId) // Filter by selected section
        .flatMap(section => {
          const times = section.times.split('\n'); // Split multiple times on newline
          const locations = section.locations.split('\n'); // Split multiple locations on newline

          // Zip times and locations together
          return times.flatMap((time, index) => {
            const location = locations[index] || 'Unknown'; // Match time with corresponding location
            const [days, startTime, , endTime] = time.split(' '); // Separate days and time range
            if (days === 'A') return []; // skip to-be-announced times
            
            return days.split('').map(day => ({
              name: course.courseData.number, // Use course number for the title
              location, // Set the matched location for this time
              startTime: getFirstOccurrence(termStartDate, day, startTime),
              endTime: getFirstOccurrence(termStartDate, day, endTime) // Parse the end time
            }));
          });
        });
    });

  // Create a basic ICS header using stable floating local times.
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourApp//Course Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  // Generate the events in ICS format
  parsedEvents.forEach((event, index) => {
    const dtStart = formatICSDate(event.startTime);
    const dtEnd = formatICSDate(event.endTime);

    // Add each event to the ICS content
    icsContent += `BEGIN:VEVENT
SUMMARY:${event.name}
LOCATION:${event.location}
DTSTART:${dtStart}
DTEND:${dtEnd}
RRULE:FREQ=WEEKLY;COUNT=10
UID:${getEventUid(event, term, index)}@caltech.dev
END:VEVENT
`;
  });

  // Close the calendar
  icsContent += `END:VCALENDAR`;

  return icsContent;
}
