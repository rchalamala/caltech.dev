import { describe, expect, it } from "vitest";
import {
  createEmptyWorkspace,
  generateCourseSections,
  lengthenCourses,
  sectionsIntersect,
  shortenCourses,
} from "./scheduling";
import {
  CourseData,
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  SectionData,
} from "../types";

function makeSection(number: number, times: string): SectionData {
  return {
    grades: "abc",
    instructor: "Professor Test",
    locations: "Baxter 101",
    number,
    times,
  };
}

function makeCourseData(id: number, sections: SectionData[]): CourseData {
  return {
    id,
    name: `Course ${id}`,
    number: `CS ${id}`,
    sections,
    units: [9, 0, 0],
    description: "",
    prerequisites: "",
    rating: "",
    true_units: "9",
    link: "https://example.com",
    comment: "",
  };
}

function makeCourseStorage(
  courseData: CourseData,
  overrides: Partial<CourseStorage> = {},
): CourseStorage {
  return {
    courseData,
    sectionId: 0,
    enabled: true,
    locked: false,
    ...overrides,
  };
}

describe("scheduling helpers", () => {
  it("detects overlapping selected sections", () => {
    const firstCourse = makeCourseStorage(
      makeCourseData(1, [makeSection(1, "M 09:00 - 10:00")]),
    );
    const secondCourse = makeCourseStorage(
      makeCourseData(2, [makeSection(1, "M 09:30 - 10:30")]),
    );

    expect(sectionsIntersect(firstCourse, secondCourse)).toBe(true);
  });

  it("generates valid unlocked arrangements within available time windows", () => {
    const availableTimes = createEmptyWorkspace().availableTimes;
    const lockedCourse = makeCourseStorage(
      makeCourseData(1, [makeSection(1, "M 09:00 - 10:00")]),
      { locked: true, sectionId: 0 },
    );
    const unlockedCourse = makeCourseStorage(
      makeCourseData(2, [
        makeSection(1, "M 09:30 - 10:30"),
        makeSection(2, "M 10:00 - 11:00"),
      ]),
    );

    const arrangements = generateCourseSections(
      [lockedCourse, unlockedCourse],
      availableTimes,
    );

    expect(arrangements).toHaveLength(1);
    expect(arrangements[0][1].sectionId).toBe(1);
  });

  it("filters out arrangements outside the allowed time range", () => {
    const availableTimes = createEmptyWorkspace().availableTimes.map(
      ([start, end]) => [start, end] as [Date, Date],
    );
    availableTimes[0] = [new Date(2018, 0, 1, 8), new Date(2018, 0, 1, 9, 45)];

    const morningCourse = makeCourseStorage(
      makeCourseData(1, [makeSection(1, "M 10:00 - 11:00")]),
    );

    const arrangements = generateCourseSections([morningCourse], availableTimes);
    expect(arrangements).toHaveLength(0);
  });

  it("round-trips shortened course state back into full course state", () => {
    const courseData = makeCourseData(3, [makeSection(1, "W 13:00 - 14:00")]);
    const course = makeCourseStorage(courseData, {
      enabled: false,
      locked: true,
      sectionId: 0,
    });
    const courseIndex: CourseIndex = { [courseData.id.toString()]: courseData };

    const shortened = shortenCourses([course]);
    const lengthened = lengthenCourses(
      shortened as CourseStorageShort[],
      courseIndex,
    );

    expect(lengthened).toEqual([course]);
  });
});
