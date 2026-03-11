import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Planner from "./Planner";
import { AppState } from "./App";
import { createEmptyWorkspace } from "./lib/scheduling";
import {
  CourseStorage,
  CourseStorageShort,
  Maybe,
  SectionData,
  CourseData,
  Workspace as WorkspaceState,
  AvailableTimes,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeSection(number: number, times: string): SectionData {
  return {
    grades: "LETTER",
    instructor: "Staff",
    locations: "Baxter 101",
    number,
    times,
  };
}

function makeCourseData(
  id: number,
  number: string,
  sections: SectionData[],
): CourseData {
  return {
    id,
    name: `Course ${id}`,
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

interface MockStateOverrides {
  courses?: CourseStorage[];
  availableTimes?: AvailableTimes;
}

function renderPlanner(overrides: MockStateOverrides = {}) {
  const emptyWorkspace = createEmptyWorkspace();
  const courses = overrides.courses ?? [];

  const mockState = {
    workspaces: [emptyWorkspace] as WorkspaceState[],
    workspaceIdx: 0,
    setWorkspace: vi.fn(),
    courses,
    addCourse: vi.fn(),
    removeCourse: vi.fn(),
    toggleCourse: vi.fn(),
    setCourses: vi.fn(),
    arrangements: [] as CourseStorageShort[][],
    arrangementIdx: null as Maybe<number>,
    nextArrangement: vi.fn(),
    prevArrangement: vi.fn(),
    toggleSectionLock: vi.fn(),
    availableTimes: overrides.availableTimes ?? emptyWorkspace.availableTimes,
    updateAvailableTimes: vi.fn(),
  };

  const utils = render(
    <AppState.Provider value={mockState}>
      <Planner />
    </AppState.Provider>,
  );

  return { ...utils, mockState };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("Planner", () => {
  it("renders the calendar without errors when no courses are added", () => {
    renderPlanner();

    // react-big-calendar renders day headers and time-picker labels: Mon, Tue, Wed, Thu, Fri
    expect(screen.getAllByText("Mon").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Fri").length).toBeGreaterThanOrEqual(1);
  });

  it("renders time pickers for 5 weekdays", () => {
    const { container } = renderPlanner();

    const timePickers = container.querySelectorAll(".time-picker");
    expect(timePickers).toHaveLength(5);
  });

  it("renders course events on the calendar", () => {
    const courseData = makeCourseData(1, "CS 1", [
      makeSection(1, "MWF 09:00 - 09:55"),
    ]);
    const course = makeCourseStorage(courseData);

    renderPlanner({ courses: [course] });

    // react-big-calendar renders event titles (MWF = 3 events)
    const events = screen.getAllByText("CS 1 Section 1");
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render events for disabled courses", () => {
    const courseData = makeCourseData(1, "CS 1", [
      makeSection(1, "MWF 09:00 - 09:55"),
    ]);
    const course = makeCourseStorage(courseData, { enabled: false });

    renderPlanner({ courses: [course] });

    expect(screen.queryByText("CS 1 Section 1")).not.toBeInTheDocument();
  });

  it("does not render events for courses without a selected section", () => {
    const courseData = makeCourseData(1, "CS 1", [
      makeSection(1, "MWF 09:00 - 09:55"),
    ]);
    const course = makeCourseStorage(courseData, { sectionId: null });

    renderPlanner({ courses: [course] });

    expect(screen.queryByText("CS 1 Section 1")).not.toBeInTheDocument();
  });

  it("renders multiple course events", () => {
    const cs = makeCourseStorage(
      makeCourseData(1, "CS 1", [makeSection(1, "MWF 09:00 - 09:55")]),
    );
    const math = makeCourseStorage(
      makeCourseData(2, "Ma 1 a", [makeSection(1, "TR 10:00 - 10:55")]),
    );

    renderPlanner({ courses: [cs, math] });

    const csEvents = screen.getAllByText("CS 1 Section 1");
    const mathEvents = screen.getAllByText("Ma 1 a Section 1");
    expect(csEvents.length).toBeGreaterThanOrEqual(1);
    expect(mathEvents.length).toBeGreaterThanOrEqual(1);
  });
});
