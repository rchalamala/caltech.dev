import { useCallback, useEffect, useState } from "react";
import {
  clearUnlockedSections,
  generateCourseSections,
  lengthenCourses,
  normalizeAvailableTime,
  normalizeAvailableTimes,
  shortenCourses,
} from "../lib/scheduling";
import {
  loadWorkspaceIdx,
  loadWorkspaces,
  saveWorkspaceIdx,
  saveWorkspaces,
} from "../lib/persistence";
import {
  AvailableTimes,
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  Maybe,
  Workspace,
} from "../types";

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

function setArrayIdx<T>(arr: T[], idx: number, element: T): T[] {
  return arr.map((value, i) => (i === idx ? element : value));
}

function clampWorkspaceIdx(workspaces: Workspace[], workspaceIdx: number): number {
  return workspaceIdx >= 0 && workspaceIdx < workspaces.length ? workspaceIdx : 0;
}

function loadPersistedWorkspaceState(
  termPath: string,
): { workspaces: Workspace[]; workspaceIdx: number } {
  const workspaces = loadWorkspaces(termPath);
  return {
    workspaces,
    workspaceIdx: clampWorkspaceIdx(workspaces, loadWorkspaceIdx(termPath)),
  };
}

/**
 * The core dedup: recalculates arrangements after any course/time change
 * and returns a fully-updated workspace object. Resets arrangementIdx to 0
 * when new arrangements are generated.
 */
function reconcileWorkspace(
  workspace: Workspace,
  courses: CourseStorage[],
  availableTimes: AvailableTimes,
  indexedCourses: CourseIndex,
): Workspace {
  const arrangements = generateCourseSections(courses, availableTimes);
  let arrangementIdx: Maybe<number> = null;
  let reconciledCourses = courses;

  if (arrangements.length === 0) {
    reconciledCourses = clearUnlockedSections(courses);
  } else {
    arrangementIdx = 0;
    reconciledCourses = lengthenCourses(arrangements[0], indexedCourses);
  }

  return {
    ...workspace,
    courses: reconciledCourses,
    arrangements,
    arrangementIdx,
    availableTimes,
  };
}

/* ------------------------------------------------------------------ */
/*  Public interface                                                   */
/* ------------------------------------------------------------------ */

export interface WorkspaceStateAPI {
  workspaces: Workspace[];
  workspaceIdx: number;
  setWorkspace: (idx: number) => void;

  courses: CourseStorage[];
  addCourse: (course: CourseStorage) => void;
  removeCourse: (course: CourseStorage) => void;
  toggleCourse: (course: CourseStorage) => void;
  setCourses: (courses: CourseStorage[]) => void;

  arrangements: CourseStorageShort[][];
  arrangementIdx: Maybe<number>;
  nextArrangement: () => void;
  prevArrangement: () => void;
  toggleSectionLock: (course: CourseStorage) => void;

  availableTimes: AvailableTimes;
  updateAvailableTimes: (dayIdx: number, isStart: boolean, day: Date) => void;
}

interface PersistedWorkspaceState {
  workspaces: Workspace[];
  workspaceIdx: number;
}

export function useWorkspaceState(
  termPath: string,
  indexedCourses: CourseIndex,
): WorkspaceStateAPI {
  const [workspaceStateByTerm, setWorkspaceStateByTerm] = useState<
    Record<string, PersistedWorkspaceState>
  >(() => ({
    [termPath]: loadPersistedWorkspaceState(termPath),
  }));

  const { workspaces, workspaceIdx } =
    workspaceStateByTerm[termPath] ?? loadPersistedWorkspaceState(termPath);

  const updateTermState = useCallback(
    (
      updater: (currentState: PersistedWorkspaceState) => PersistedWorkspaceState,
    ) => {
      setWorkspaceStateByTerm((prev) => {
        const currentState = prev[termPath] ?? loadPersistedWorkspaceState(termPath);
        const nextState = updater(currentState);
        return {
          ...prev,
          [termPath]: {
            ...nextState,
            workspaceIdx: clampWorkspaceIdx(
              nextState.workspaces,
              nextState.workspaceIdx,
            ),
          },
        };
      });
    },
    [termPath],
  );

  // Persist to localStorage on every change
  useEffect(() => {
    saveWorkspaces(termPath, workspaces);
    saveWorkspaceIdx(termPath, workspaceIdx);
  }, [termPath, workspaces, workspaceIdx]);

  // Derived state for the active workspace
  const activeWorkspace = workspaces[workspaceIdx];
  const courses = activeWorkspace.courses;
  const availableTimes = normalizeAvailableTimes(
    activeWorkspace.availableTimes.map(([start, end]) => [
      new Date(start),
      new Date(end),
    ]),
  );
  const { arrangements, arrangementIdx } = activeWorkspace;

  // Helper: update the active workspace in the workspaces array
  const updateActive = useCallback(
    (updated: Workspace) => {
      updateTermState((currentState) => ({
        ...currentState,
        workspaces: setArrayIdx(
          currentState.workspaces,
          currentState.workspaceIdx,
          updated,
        ),
      }));
    },
    [updateTermState],
  );

  /* ---- Mutations ---- */

  const addCourse = useCallback(
    (newCourse: CourseStorage) => {
      const alreadyExists = courses.find(
        (c) => c.courseData.id === newCourse.courseData.id,
      );
      const newCourses = alreadyExists
        ? courses
        : [...courses, { ...newCourse, locked: true, sectionId: 0 }];

      updateActive(
        reconcileWorkspace(activeWorkspace, newCourses, availableTimes, indexedCourses),
      );
    },
    [courses, activeWorkspace, availableTimes, indexedCourses, updateActive],
  );

  const removeCourse = useCallback(
    (course: CourseStorage) => {
      const newCourses = courses.filter(
        (c) => c.courseData.id !== course.courseData.id,
      );
      updateActive(
        reconcileWorkspace(activeWorkspace, newCourses, availableTimes, indexedCourses),
      );
    },
    [courses, activeWorkspace, availableTimes, indexedCourses, updateActive],
  );

  const toggleCourse = useCallback(
    (course: CourseStorage) => {
      const updated = { ...course, enabled: !course.enabled };
      let newCourses = courses.map((c) =>
        c.courseData.id === updated.courseData.id ? updated : c,
      );

      const newArrangements = generateCourseSections(newCourses, availableTimes);
      let newArrangementIdx = arrangementIdx;

      if (newArrangements.length === 0) {
        newCourses = clearUnlockedSections(newCourses);
        newArrangementIdx = null;
      } else {
        // Preserve arrangementIdx when disabling a locked course
        if (updated.enabled || !updated.locked) {
          newArrangementIdx = 0;
          newCourses = lengthenCourses(newArrangements[0], indexedCourses);
        }
      }

      updateActive({
        ...activeWorkspace,
        courses: newCourses,
        arrangements: newArrangements,
        arrangementIdx: newArrangementIdx,
      });
    },
    [courses, activeWorkspace, availableTimes, arrangementIdx, indexedCourses, updateActive],
  );

  const toggleSectionLock = useCallback(
    (course: CourseStorage) => {
      const updated = { ...course, locked: !course.locked };
      const newCourses = courses.map((c) =>
        c.courseData.id === updated.courseData.id ? updated : c,
      );
      updateActive(
        reconcileWorkspace(activeWorkspace, newCourses, availableTimes, indexedCourses),
      );
    },
    [courses, activeWorkspace, availableTimes, indexedCourses, updateActive],
  );

  const setCourses = useCallback(
    (newCourses: CourseStorage[]) => {
      updateActive(
        reconcileWorkspace(activeWorkspace, newCourses, availableTimes, indexedCourses),
      );
    },
    [activeWorkspace, availableTimes, indexedCourses, updateActive],
  );

  const nextArrangement = useCallback(() => {
    const ws = workspaces[workspaceIdx];
    let newIdx: Maybe<number>;
    if (ws.arrangements.length === 0) {
      newIdx = null;
    } else if (ws.arrangementIdx === null) {
      newIdx = 0;
    } else {
      newIdx = (ws.arrangementIdx + 1) % ws.arrangements.length;
    }

    const shortened =
      newIdx === null ? shortenCourses(ws.courses) : ws.arrangements[newIdx];
    const newCourses = lengthenCourses(shortened, indexedCourses);

    updateActive({ ...ws, courses: newCourses, arrangementIdx: newIdx });
  }, [workspaces, workspaceIdx, indexedCourses, updateActive]);

  const prevArrangement = useCallback(() => {
    const ws = workspaces[workspaceIdx];
    let newIdx: Maybe<number>;
    if (ws.arrangements.length === 0) {
      newIdx = null;
    } else if (ws.arrangementIdx === null) {
      newIdx = 0;
    } else {
      newIdx =
        (ws.arrangements.length + ws.arrangementIdx - 1) %
        ws.arrangements.length;
    }

    const shortened =
      newIdx === null ? shortenCourses(ws.courses) : ws.arrangements[newIdx];
    const newCourses = lengthenCourses(shortened, indexedCourses);

    updateActive({ ...ws, courses: newCourses, arrangementIdx: newIdx });
  }, [workspaces, workspaceIdx, indexedCourses, updateActive]);

  const setWorkspace = useCallback(
    (idx: number) => {
      updateTermState((currentState) =>
        idx >= 0 && idx < currentState.workspaces.length
          ? { ...currentState, workspaceIdx: idx }
          : currentState,
      );
    },
    [updateTermState],
  );

  const updateAvailableTimes = useCallback(
    (dayIdx: number, isStart: boolean, day: Date) => {
      const normalizedDay = normalizeAvailableTime(dayIdx, day);
      const newAvailableTimes: AvailableTimes = setArrayIdx(
        availableTimes,
        dayIdx,
        [
          isStart ? normalizedDay : availableTimes[dayIdx][0],
          isStart ? availableTimes[dayIdx][1] : normalizedDay,
        ],
      );

      let newCourses = courses;
      const newArrangements = generateCourseSections(newCourses, newAvailableTimes);
      let newArrangementIdx = arrangementIdx;

      if (newArrangements.length === 0) {
        newCourses = clearUnlockedSections(newCourses);
        newArrangementIdx = null;
      } else {
        const isWidening =
          (isStart && normalizedDay < availableTimes[dayIdx][0]) ||
          (!isStart && normalizedDay > availableTimes[dayIdx][1]);
        if (!isWidening || newArrangements.length !== arrangements.length) {
          newArrangementIdx = 0;
          newCourses = lengthenCourses(newArrangements[0], indexedCourses);
        }
      }

      updateActive({
        ...activeWorkspace,
        courses: newCourses,
        arrangements: newArrangements,
        arrangementIdx: newArrangementIdx,
        availableTimes: newAvailableTimes,
      });
    },
    [
      courses,
      activeWorkspace,
      availableTimes,
      arrangements,
      arrangementIdx,
      indexedCourses,
      updateActive,
    ],
  );

  return {
    workspaces,
    workspaceIdx,
    setWorkspace,
    courses,
    addCourse,
    removeCourse,
    toggleCourse,
    setCourses,
    arrangements,
    arrangementIdx,
    nextArrangement,
    prevArrangement,
    toggleSectionLock,
    availableTimes,
    updateAvailableTimes,
  };
}
