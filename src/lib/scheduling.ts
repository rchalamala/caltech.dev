import {
  AvailableTimes,
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  Maybe,
  SectionData,
  Workspace,
} from "../types";
import { parseTimes } from "./time";

function getSelectedSection(course: CourseStorage): Maybe<SectionData> {
  if (course.sectionId === null) {
    return null;
  }

  const selectedSection = course.courseData.sections[course.sectionId];
  if (!selectedSection) {
    return null;
  }

  return (
    course.courseData.sections.find(
      (section) => section.number === selectedSection.number,
    ) ?? null
  );
}

export function createEmptyWorkspace(): Workspace {
  return {
    courses: [],
    arrangements: [],
    arrangementIdx: null,
    availableTimes: [
      [new Date(2018, 0, 1, 8), new Date(2018, 0, 1, 23)],
      [new Date(2018, 0, 2, 8), new Date(2018, 0, 2, 23)],
      [new Date(2018, 0, 3, 8), new Date(2018, 0, 3, 23)],
      [new Date(2018, 0, 4, 8), new Date(2018, 0, 4, 23)],
      [new Date(2018, 0, 5, 8), new Date(2018, 0, 5, 23)],
    ],
  };
}

export function normalizeAvailableTime(dayIndex: number, time: Date): Date {
  return new Date(2018, 0, dayIndex + 1, time.getHours(), time.getMinutes());
}

export function normalizeAvailableTimes(
  availableTimes: AvailableTimes,
): AvailableTimes {
  return availableTimes.map(([start, end], dayIndex) => [
    normalizeAvailableTime(dayIndex, start),
    normalizeAvailableTime(dayIndex, end),
  ]);
}

export function sectionsIntersect(a: CourseStorage, b: CourseStorage): boolean {
  if (!a.enabled || !b.enabled || a.sectionId === null || b.sectionId === null) {
    return false;
  }

  const sectionA = getSelectedSection(a);
  const sectionB = getSelectedSection(b);

  if (!sectionA || !sectionB) {
    return false;
  }

  const timesA = parseTimes(sectionA.times);
  const timesB = parseTimes(sectionB.times);

  for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
    for (const intervalA of timesA[dayIndex]) {
      for (const intervalB of timesB[dayIndex]) {
        if (
          intervalA &&
          intervalB &&
          ((intervalA.start >= intervalB.start &&
            intervalA.start < intervalB.end) ||
            (intervalB.start >= intervalA.start &&
              intervalB.start < intervalA.end))
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

export function shortenCourses(
  courses: CourseStorage[],
): CourseStorageShort[] {
  return courses.map((course) => ({
    courseId: course.courseData.id,
    sectionId: course.sectionId,
    enabled: course.enabled,
    locked: course.locked,
  }));
}

export function lengthenCourses(
  shortened: CourseStorageShort[],
  courseIndex: CourseIndex,
): CourseStorage[] {
  return shortened.map((course) => ({
    courseData: courseIndex[course.courseId.toString()]!,
    sectionId: course.sectionId,
    enabled: course.enabled,
    locked: course.locked,
  }));
}

export function generateCourseSections(
  requests: CourseStorage[],
  availableTimes: AvailableTimes,
): CourseStorageShort[][] {
  if (requests.length === 0) {
    return [];
  }

  const output: CourseStorageShort[][] = [];

  const verifyArrangement = (arrangement: CourseStorage[]) => {
    let valid = true;

    for (let i = 0; i < arrangement.length; i += 1) {
      for (let j = i + 1; j < arrangement.length; j += 1) {
        valid &&=
          !sectionsIntersect(arrangement[i], arrangement[j]) ||
          (arrangement[i].locked && arrangement[j].locked);
      }
    }

    for (const course of arrangement) {
      const section = getSelectedSection(course);
      if (!section) {
        continue;
      }

      const intervals = parseTimes(section.times);
      for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
        for (const interval of intervals[dayIndex]) {
          if (!interval) {
            continue;
          }

          valid &&=
            availableTimes[dayIndex][0].getTime() <= interval.start.getTime() &&
            interval.end.getTime() <= availableTimes[dayIndex][1].getTime();
        }
      }
    }

    return valid;
  };

  const search = (accumulator: CourseStorage[], index: number) => {
    if (index === requests.length) {
      output.push(shortenCourses(accumulator));
      return;
    }

    const request = requests[index];

    if (
      !request.enabled ||
      request.locked ||
      (request.courseData.sections.length > 0 &&
        request.courseData.sections[0].times === "A")
    ) {
      accumulator.push(request);
      if (verifyArrangement(accumulator)) {
        search(accumulator, index + 1);
      }
      accumulator.pop();
      return;
    }

    for (let sectionId = 0; sectionId < request.courseData.sections.length; sectionId += 1) {
      accumulator.push({ ...request, sectionId });
      if (verifyArrangement(accumulator)) {
        search(accumulator, index + 1);
      }
      accumulator.pop();
    }
  };

  search([], 0);
  return output;
}

export function reorder<T>(
  list: T[],
  startIndex: number,
  endIndex: number,
): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}
