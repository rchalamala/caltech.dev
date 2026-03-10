import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Workspace from "./Workspace";
import { AllCourses, AppState } from "./App";
import { createEmptyWorkspace } from "./lib/scheduling";
import {
  CourseData,
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  Maybe,
  SectionData,
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
  name: string,
  sections: SectionData[] = [makeSection(1, "MWF 09:00 - 09:55")],
): CourseData {
  return {
    id,
    name,
    number,
    sections,
    units: [3, 0, 6],
    description: "A test course",
    prerequisites: "None",
    rating: "4.5",
    true_units: "9",
    link: "https://example.com",
    comment: "",
  };
}

const SAMPLE_COURSES: CourseIndex = {
  "1": makeCourseData(1, "CS 1", "Intro to CS"),
  "2": makeCourseData(2, "Ma 1 a", "Calculus", [
    makeSection(1, "MWF 10:00 - 10:55"),
    makeSection(2, "TR 09:00 - 10:25"),
  ]),
  "3": makeCourseData(3, "Ph 1 a", "Mechanics"),
};

function makeCourseStorage(
  id: number,
  overrides: Partial<CourseStorage> = {},
): CourseStorage {
  return {
    courseData: SAMPLE_COURSES[id.toString()],
    sectionId: 0,
    enabled: true,
    locked: false,
    ...overrides,
  };
}

interface MockStateOverrides {
  courses?: CourseStorage[];
  workspaceIdx?: number;
  workspaces?: WorkspaceState[];
  arrangements?: CourseStorageShort[][];
  arrangementIdx?: Maybe<number>;
  availableTimes?: AvailableTimes;
}

function createMockState(overrides: MockStateOverrides = {}) {
  const emptyWorkspace = createEmptyWorkspace();
  const courses = overrides.courses ?? [];
  const workspaceIdx = overrides.workspaceIdx ?? 0;
  const workspaces = overrides.workspaces ?? [
    { ...emptyWorkspace, courses },
    emptyWorkspace,
    emptyWorkspace,
    emptyWorkspace,
    emptyWorkspace,
  ];

  return {
    workspaces,
    workspaceIdx,
    setWorkspace: vi.fn(),
    courses,
    addCourse: vi.fn(),
    removeCourse: vi.fn(),
    toggleCourse: vi.fn(),
    setCourses: vi.fn(),
    arrangements: overrides.arrangements ?? [],
    arrangementIdx: overrides.arrangementIdx ?? null,
    nextArrangement: vi.fn(),
    prevArrangement: vi.fn(),
    toggleSectionLock: vi.fn(),
    availableTimes: overrides.availableTimes ?? emptyWorkspace.availableTimes,
    updateAvailableTimes: vi.fn(),
  };
}

function renderWorkspace(
  stateOverrides: MockStateOverrides = {},
  courseIndex: CourseIndex = SAMPLE_COURSES,
) {
  const mockState = createMockState(stateOverrides);

  const utils = render(
    <AllCourses.Provider value={courseIndex}>
      <AppState.Provider value={mockState}>
        <Workspace term="sp2026" />
      </AppState.Provider>
    </AllCourses.Provider>,
  );

  return { ...utils, mockState };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("Workspace", () => {
  it("shows empty state when no courses are added", () => {
    renderWorkspace();

    expect(
      screen.getByText(/no courses added/i),
    ).toBeInTheDocument();
  });

  it("renders course entries when courses exist", () => {
    const courses = [makeCourseStorage(1), makeCourseStorage(2)];
    renderWorkspace({ courses });

    expect(screen.getByText("CS 1")).toBeInTheDocument();
    expect(screen.getByText("Ma 1 a")).toBeInTheDocument();
  });

  it("displays unit totals for enabled courses", () => {
    const courses = [
      makeCourseStorage(1, { enabled: true }),
      makeCourseStorage(2, { enabled: true }),
    ];
    renderWorkspace({ courses });

    // Each course has units [3, 0, 6], so total = 18 units (6-0-12)
    expect(screen.getByText(/18 units \(6-0-12\)/)).toBeInTheDocument();
  });

  it("calls removeCourse when delete button is clicked", async () => {
    const user = userEvent.setup();
    const courses = [makeCourseStorage(1)];
    const { mockState } = renderWorkspace({ courses });

    // Find the delete button (MUI IconButton with color="error")
    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("[data-testid='DeleteIcon']"),
    );
    expect(deleteButtons.length).toBeGreaterThan(0);

    await user.click(deleteButtons[0]);
    expect(mockState.removeCourse).toHaveBeenCalledWith(courses[0]);
  });

  it("calls toggleCourse when the enable/disable switch is clicked", async () => {
    const user = userEvent.setup();
    const courses = [makeCourseStorage(1)];
    const { mockState, container } = renderWorkspace({ courses });

    // MUI Switch renders an <input type="checkbox"> inside the component
    const checkbox = container.querySelector<HTMLInputElement>("input[type='checkbox']");
    expect(checkbox).not.toBeNull();

    await user.click(checkbox!);
    expect(mockState.toggleCourse).toHaveBeenCalledWith(courses[0]);
  });

  it("calls toggleSectionLock when lock icon is clicked", async () => {
    const user = userEvent.setup();
    const courses = [makeCourseStorage(1, { locked: false })];
    const { mockState } = renderWorkspace({ courses });

    // Find the lock-open button
    const lockButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("[data-testid='LockOpenIcon']"),
    );
    expect(lockButtons.length).toBeGreaterThan(0);

    await user.click(lockButtons[0]);
    expect(mockState.toggleSectionLock).toHaveBeenCalledWith(courses[0]);
  });

  it("shows workspace switcher with 5 tabs", () => {
    renderWorkspace();

    const switcher = screen.getByText("1").closest(".workspace-switcher") as HTMLElement;
    expect(switcher).toBeInTheDocument();

    for (let i = 1; i <= 5; i++) {
      expect(within(switcher).getByText(`${i}`)).toBeInTheDocument();
    }
  });

  it("calls setWorkspace when switching tabs", async () => {
    const user = userEvent.setup();
    const { mockState } = renderWorkspace();

    const tab3 = screen.getByText("3");
    await user.click(tab3);

    expect(mockState.setWorkspace).toHaveBeenCalledWith(2); // 0-indexed
  });

  it("shows arrangement navigation when unlocked courses exist", () => {
    const courses = [makeCourseStorage(1, { locked: false, enabled: true })];
    const arrangements: CourseStorageShort[][] = [
      [{ courseId: 1, sectionId: 0, enabled: true, locked: false }],
      [{ courseId: 1, sectionId: 0, enabled: true, locked: false }],
    ];

    renderWorkspace({
      courses,
      arrangements,
      arrangementIdx: 0,
    });

    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows 'All sections set' when all courses are locked", () => {
    const courses = [makeCourseStorage(1, { locked: true })];
    renderWorkspace({ courses });

    expect(screen.getByText(/all sections set/i)).toBeInTheDocument();
  });

  it("calls prevArrangement and nextArrangement on arrow clicks", async () => {
    const user = userEvent.setup();
    const courses = [makeCourseStorage(1, { locked: false, enabled: true })];
    const arrangements: CourseStorageShort[][] = [
      [{ courseId: 1, sectionId: 0, enabled: true, locked: false }],
      [{ courseId: 1, sectionId: 0, enabled: true, locked: false }],
    ];

    const { mockState } = renderWorkspace({
      courses,
      arrangements,
      arrangementIdx: 0,
    });

    // Find arrow buttons by their SVG icons
    const arrowButtons = screen.getAllByRole("button").filter(
      (btn) =>
        btn.querySelector("[data-testid='ArrowBackIcon']") ||
        btn.querySelector("[data-testid='ArrowForwardIcon']"),
    );
    expect(arrowButtons).toHaveLength(2);

    await user.click(arrowButtons[0]); // back
    expect(mockState.prevArrangement).toHaveBeenCalled();

    await user.click(arrowButtons[1]); // forward
    expect(mockState.nextArrangement).toHaveBeenCalled();
  });

  it("renders control buttons", () => {
    renderWorkspace();

    expect(screen.getByText("Unlock All")).toBeInTheDocument();
    expect(screen.getByText("Lock All")).toBeInTheDocument();
    expect(screen.getByText("Enable All")).toBeInTheDocument();
    expect(screen.getByText("Disable All")).toBeInTheDocument();
    expect(screen.getByText("Remove All")).toBeInTheDocument();
    expect(screen.getByText("Default Schedule")).toBeInTheDocument();
    expect(screen.getByText("Import Workspace")).toBeInTheDocument();
    expect(screen.getByText("Export Workspace")).toBeInTheDocument();
    expect(screen.getByText("Export .ics")).toBeInTheDocument();
  });

  it("calls setCourses with empty array on Remove All", async () => {
    const user = userEvent.setup();
    const courses = [makeCourseStorage(1)];
    const { mockState } = renderWorkspace({ courses });

    await user.click(screen.getByText("Remove All"));
    expect(mockState.setCourses).toHaveBeenCalledWith([]);
  });
});
