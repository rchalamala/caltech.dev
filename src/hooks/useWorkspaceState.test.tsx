import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "../lib/scheduling";
import { CourseData, CourseIndex, CourseStorage, SectionData, Workspace } from "../types";
import { useWorkspaceState } from "./useWorkspaceState";

function makeSection(number: number): SectionData {
  return {
    grades: "LETTER",
    instructor: "Professor Test",
    locations: "Baxter 101",
    number,
    times: "MWF 09:00 - 09:55",
  };
}

function makeCourseData(id: number, number: string): CourseData {
  return {
    id,
    name: `Course ${id}`,
    number,
    sections: [makeSection(1)],
    units: [3, 0, 6],
    description: "",
    prerequisites: "",
    rating: "",
    true_units: "9",
    link: "",
    comment: "",
  };
}

const COURSE_INDEX: CourseIndex = {
  "1": makeCourseData(1, "CS 1"),
  "2": makeCourseData(2, "Ma 1 a"),
};

function makeCourseStorage(id: number): CourseStorage {
  return {
    courseData: COURSE_INDEX[id.toString()],
    sectionId: 0,
    enabled: true,
    locked: true,
  };
}

function makeWorkspaces(courseIds: number[], selectedWorkspaceIdx: number): Workspace[] {
  return Array.from({ length: 5 }, (_, idx) =>
    idx === selectedWorkspaceIdx
      ? {
          ...createEmptyWorkspace(),
          courses: courseIds.map(makeCourseStorage),
        }
      : createEmptyWorkspace(),
  );
}

function Harness({ termPath }: { termPath: string }) {
  const state = useWorkspaceState(termPath, COURSE_INDEX);
  return (
    <>
      <p data-testid="workspace-idx">{state.workspaceIdx}</p>
      <p data-testid="course-numbers">
        {state.courses.map((course) => course.courseData.number).join(",")}
      </p>
    </>
  );
}

describe("useWorkspaceState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reloads persisted state when the term path changes", async () => {
    localStorage.setItem(
      "workspaces/sp2026",
      JSON.stringify(makeWorkspaces([1], 0)),
    );
    localStorage.setItem("workspaceIdx/sp2026", JSON.stringify(0));
    localStorage.setItem(
      "workspaces/fa2025",
      JSON.stringify(makeWorkspaces([2], 2)),
    );
    localStorage.setItem("workspaceIdx/fa2025", JSON.stringify(2));

    const { rerender } = render(<Harness termPath="/sp2026" />);

    expect(screen.getByTestId("workspace-idx")).toHaveTextContent("0");
    expect(screen.getByTestId("course-numbers")).toHaveTextContent("CS 1");

    rerender(<Harness termPath="/fa2025" />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-idx")).toHaveTextContent("2");
      expect(screen.getByTestId("course-numbers")).toHaveTextContent("Ma 1 a");
    });
  });
});
