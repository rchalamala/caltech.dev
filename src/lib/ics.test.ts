import { describe, expect, it } from "vitest";
import { exportICS } from "./ics";
import { CourseData, CourseStorage, SectionData } from "../types";

function makeSection(number: number, times: string, locations = "Baxter 101"): SectionData {
  return {
    grades: "LETTER",
    instructor: "Professor Test",
    locations,
    number,
    times,
  };
}

function makeCourseData(id: number, number: string, sections: SectionData[]): CourseData {
  return {
    id,
    name: `Test Course ${id}`,
    number,
    sections,
    units: [3, 0, 6],
    description: "",
    prerequisites: "",
    rating: "",
    true_units: "9",
    link: "",
    comment: "",
  };
}

function makeCourse(
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

describe("exportICS", () => {
  it("produces valid VCALENDAR structure", () => {
    const ics = exportICS("sp2026", []);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("generates a VEVENT for a single course with one meeting day", () => {
    const section = makeSection(1, "M 09:00 - 09:55");
    const course = makeCourse(makeCourseData(1, "CS 1", [section]));

    const ics = exportICS("sp2026", [course]);

    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:CS 1");
    expect(ics).toContain("LOCATION:Baxter 101");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;COUNT=10");
    expect(ics).toContain("END:VEVENT");
  });

  it("generates separate VEVENTs for multi-day meetings", () => {
    const section = makeSection(1, "MWF 10:00 - 10:55");
    const course = makeCourse(makeCourseData(1, "Ma 1 a", [section]));

    const ics = exportICS("sp2026", [course]);

    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(3); // M, W, F
  });

  it("excludes disabled courses", () => {
    const section = makeSection(1, "M 09:00 - 09:55");
    const course = makeCourse(
      makeCourseData(1, "CS 1", [section]),
      { enabled: false },
    );

    const ics = exportICS("sp2026", [course]);

    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("skips TBA (A) times", () => {
    const section = makeSection(1, "A");
    const course = makeCourse(makeCourseData(1, "CS 1", [section]));

    const ics = exportICS("sp2026", [course]);

    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("handles multiline times with matched locations", () => {
    const section = makeSection(
      1,
      "MWF 09:00 - 09:55\nTR 13:00 - 14:25",
      "Baxter 101\nSloan 151",
    );
    const course = makeCourse(makeCourseData(1, "Ph 1 a", [section]));

    const ics = exportICS("sp2026", [course]);

    // MWF = 3 events + TR = 2 events = 5 total
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(5);

    expect(ics).toContain("LOCATION:Baxter 101");
    expect(ics).toContain("LOCATION:Sloan 151");
  });

  it("only exports the selected section", () => {
    const section1 = makeSection(1, "M 09:00 - 09:55");
    const section2 = makeSection(2, "T 10:00 - 10:55");
    const courseData = makeCourseData(1, "CS 1", [section1, section2]);

    // sectionId 0 corresponds to section number 1
    const course = makeCourse(courseData, { sectionId: 0 });

    const ics = exportICS("sp2026", [course]);

    expect(ics).toContain("BEGIN:VEVENT");
    // Should only have 1 event (Monday from section 1, not Tuesday from section 2)
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(1);
  });

  it("matches sections by stored index instead of section number", () => {
    const section1 = makeSection(7, "M 09:00 - 09:55", "Baxter 101");
    const section2 = makeSection(11, "T 10:00 - 10:55", "Sloan 151");
    const courseData = makeCourseData(1, "CS 1", [section1, section2]);
    const course = makeCourse(courseData, { sectionId: 1 });

    const ics = exportICS("sp2026", [course]);

    expect(ics).toContain("LOCATION:Sloan 151");
    expect(ics).not.toContain("LOCATION:Baxter 101");
  });
});
