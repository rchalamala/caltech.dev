import { useCallback, useEffect, useMemo, useState, createContext } from "react";
import Planner from "./Planner";
import { parseTimes } from "./Planner";
import Workspace from "./Workspace";
import Modal from "./Modal";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import { motion } from "framer-motion";

const CURRENT_TERM = "/sp2026";

const courseDataUrls: Record<string, string> = {
  "/fa2023": "/data/IndexedTotalFA2022-23.json",
  "/wi2023": "/data/IndexedTotalWI2022-23.json",
  "/sp2023": "/data/IndexedTotalSP2022-23.json",
  "/fa2024": "/data/IndexedTotalFA2023-24.json",
  "/wi2024": "/data/IndexedTotalWI2023-24.json",
  "/sp2024": "/data/IndexedTotalSP2023-24.json",
  "/fa2025": "/data/IndexedTotalFA2024-25.json",
  "/wi2025": "/data/IndexedTotalWI2024-25.json",
  "/sp2025": "/data/IndexedTotalSP2024-25.json",
  "/fa2026": "/data/IndexedTotalFA2025-26.json",
  "/wi2026": "/data/IndexedTotalWI2025-26.json",
  "/sp2026": "/data/IndexedTotalSP2025-26.json",
};

export const AllCourses = createContext<CourseIndex>({});

const WEEKDAY_INDICES: WeekdayIndex[] = [0, 1, 2, 3, 4];

function defaultAvailableTimes(): AvailableTimes {
  return [
    [new Date(2025, 0, 1, 8), new Date(2025, 0, 1, 23)],
    [new Date(2025, 0, 2, 8), new Date(2025, 0, 2, 23)],
    [new Date(2025, 0, 3, 8), new Date(2025, 0, 3, 23)],
    [new Date(2025, 0, 4, 8), new Date(2025, 0, 4, 23)],
    [new Date(2025, 0, 5, 8), new Date(2025, 0, 5, 23)],
  ];
}

function emptyWorkspace(): Workspace {
  return {
    courses: [],
    arrangements: [],
    arrangementIdx: null,
    availableTimes: defaultAvailableTimes(),
  };
}

interface AppStateProps {
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
  updateAvailableTimes: (dayIdx: WeekdayIndex, isStart: boolean, day: Date) => void;
}

/** Allows to easily add/remove courses to `state` */
export const AppState = createContext<AppStateProps>({
  workspaces: [emptyWorkspace()],
  workspaceIdx: 0,
  setWorkspace: () => null,

  courses: [],
  addCourse: () => null,
  removeCourse: () => null,
  toggleCourse: () => null,
  setCourses: () => null,

  arrangements: [],
  arrangementIdx: null,
  nextArrangement: () => null,
  prevArrangement: () => null,
  toggleSectionLock: () => null,

  availableTimes: defaultAvailableTimes(),
  updateAvailableTimes: () => null,
});

function sectionsIntersect(a: CourseStorage, b: CourseStorage): boolean {
  if (!a.enabled || !b.enabled) {
    return false;
  }
  if (a.sectionId === null || b.sectionId === null) {
    return false;
  }
  const selectedA = a.courseData.sections[a.sectionId];
  const selectedB = b.courseData.sections[b.sectionId];
  if (selectedA === undefined || selectedB === undefined) {
    return false;
  }
  const sectionA = a.courseData.sections.find(
    (section) => section.number === selectedA.number,
  );
  const sectionB = b.courseData.sections.find(
    (section) => section.number === selectedB.number,
  );
  if (sectionA === undefined || sectionB === undefined) {
    return false;
  }

  const timesA = parseTimes(sectionA.times);
  const timesB = parseTimes(sectionB.times);

  for (const i of WEEKDAY_INDICES) {
    for (const intervalA of timesA[i]) {
      for (const intervalB of timesB[i]) {
        if (
          (intervalA.start >= intervalB.start &&
            intervalA.start < intervalB.end) ||
          (intervalB.start >= intervalA.start &&
            intervalB.start < intervalA.end)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

export function shortenCourses(courses: CourseStorage[]): CourseStorageShort[] {
  return courses.map((storage) => {
    return {
      courseId: storage.courseData.id,
      sectionId: storage.sectionId,
      enabled: storage.enabled,
      locked: storage.locked,
    };
  });
}

export function lengthenCourses(
  shortened: CourseStorageShort[],
  courseIndex: CourseIndex,
): CourseStorage[] {
  return shortened.flatMap((storage) => {
    const courseData = courseIndex[storage.courseId.toString()];
    if (courseData === undefined) {
      return [];
    }

    return [
      {
        courseData,
        sectionId: storage.sectionId,
        enabled: storage.enabled,
        locked: storage.locked,
      },
    ];
  });
}

/** Takes a list of course requests and generates a list of possible arrangements.
 One section from each class will be selected in an arrangement, and
 none of these sections will have overlapping times. */
function generateCourseSections(
  requests: CourseStorage[],
  availableTimes: AvailableTimes,
): CourseStorageShort[][] {
  if (requests.length === 0) {
    return [];
  }
  // console.log("generating sections, ", requests)
  const output: CourseStorageShort[][] = [];

  const verify = (arr: CourseStorage[]) => {
    let valid = true;

    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const left = arr[i];
        const right = arr[j];
        if (left === undefined || right === undefined) {
          continue;
        }
        valid &&= !sectionsIntersect(left, right) || (left.locked && right.locked);
      }
    }

    for (const course of arr) {
      if (course.sectionId === null) {
        continue;
      }
      const selectedSection = course.courseData.sections[course.sectionId];
      if (selectedSection === undefined) {
        return false;
      }
      const section = course.courseData.sections.find(
        (candidate) => candidate.number === selectedSection.number,
      );
      if (section === undefined) {
        return false;
      }
      const intervals = parseTimes(section.times);
      for (const j of WEEKDAY_INDICES) {
        const [availableStart, availableEnd] = availableTimes[j];
        for (const interval of intervals[j]) {
          valid &&=
            availableStart.getTime() <= interval.start.getTime() &&
            interval.end.getTime() <= availableEnd.getTime();
        }
      }
    }

    return valid;
  };

  const search = (acc: CourseStorage[], idx: number) => {
    // if a section from each course has been selected
    if (idx === requests.length) {
      output.push(shortenCourses(acc));
      return;
    }
    // add a course/section pair
    const request = requests[idx];
    if (request === undefined) {
      return;
    }

    if (
      !request.enabled ||
      request.locked ||
      // ignore "A" courses to reduce the number of total arrangements
      request.courseData.sections[0]?.times === "A"
    ) {
      acc.push(request);
      if (verify(acc)) {
        search(acc, idx + 1);
      }
      acc.pop();
    } else {
      // otherwise, look through all sections
      for (let i = 0; i < request.courseData.sections.length; i++) {
        const new_request = { ...request, sectionId: i };
        acc.push(new_request);
        if (verify(acc)) {
          search(acc, idx + 1);
        }
        acc.pop();
      }
    }
  };

  search([], 0);
  return output;
}

function setArrayIdx<T>(arr: readonly T[], idx: number, element: T): T[] {
  return arr.map((value, i) => {
    if (i === idx) {
      return element;
    } else {
      return value;
    }
  });
}

function cloneAvailableTimes(availableTimes: AvailableTimes): AvailableTimes {
  return [
    [new Date(availableTimes[0][0]), new Date(availableTimes[0][1])],
    [new Date(availableTimes[1][0]), new Date(availableTimes[1][1])],
    [new Date(availableTimes[2][0]), new Date(availableTimes[2][1])],
    [new Date(availableTimes[3][0]), new Date(availableTimes[3][1])],
    [new Date(availableTimes[4][0]), new Date(availableTimes[4][1])],
  ];
}

function setAvailableTime(
  availableTimes: AvailableTimes,
  dayIdx: WeekdayIndex,
  availability: DayAvailability,
): AvailableTimes {
  return [
    dayIdx === 0 ? availability : availableTimes[0],
    dayIdx === 1 ? availability : availableTimes[1],
    dayIdx === 2 ? availability : availableTimes[2],
    dayIdx === 3 ? availability : availableTimes[3],
    dayIdx === 4 ? availability : availableTimes[4],
  ];
}

function clearUnlockedSections(courses: CourseStorage[]): CourseStorage[] {
  return courses.map((course) =>
    course.locked ? course : { ...course, sectionId: null },
  );
}

function firstLengthenedArrangement(
  arrangements: CourseStorageShort[][],
  indexedCourses: CourseIndex,
): { courses: CourseStorage[]; arrangementIdx: Maybe<number> } {
  const firstArrangement = arrangements[0];
  if (firstArrangement === undefined) {
    return { courses: [], arrangementIdx: null };
  }

  return {
    courses: lengthenCourses(firstArrangement, indexedCourses),
    arrangementIdx: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isSectionData(value: unknown): value is SectionData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["grades"] === "string" &&
    typeof value["instructor"] === "string" &&
    typeof value["locations"] === "string" &&
    typeof value["number"] === "number" &&
    typeof value["times"] === "string"
  );
}

function isCourseData(value: unknown): value is CourseData {
  if (!isRecord(value) || !isUnknownArray(value["sections"])) {
    return false;
  }

  return (
    typeof value["id"] === "number" &&
    typeof value["name"] === "string" &&
    typeof value["number"] === "string" &&
    value["sections"].every(isSectionData) &&
    isUnknownArray(value["units"]) &&
    value["units"].every((unit) => typeof unit === "number") &&
    typeof value["description"] === "string" &&
    typeof value["prerequisites"] === "string" &&
    typeof value["rating"] === "string" &&
    typeof value["true_units"] === "string" &&
    typeof value["link"] === "string" &&
    typeof value["comment"] === "string"
  );
}

function isCourseIndex(value: unknown): value is CourseIndex {
  return isRecord(value) && Object.values(value).every(isCourseData);
}

function isSectionId(value: unknown): value is Maybe<number> {
  return value === null || typeof value === "number";
}

function isCourseStorage(value: unknown): value is CourseStorage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isCourseData(value["courseData"]) &&
    isSectionId(value["sectionId"]) &&
    typeof value["enabled"] === "boolean" &&
    typeof value["locked"] === "boolean"
  );
}

function isCourseStorageShort(value: unknown): value is CourseStorageShort {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["courseId"] === "number" &&
    isSectionId(value["sectionId"]) &&
    typeof value["enabled"] === "boolean" &&
    typeof value["locked"] === "boolean"
  );
}

function parseStoredDate(value: unknown, fallback: Date): Date {
  if (
    value instanceof Date ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function parseStoredAvailableTimes(value: unknown): AvailableTimes {
  const fallback = defaultAvailableTimes();
  if (!isUnknownArray(value)) {
    return fallback;
  }

  return [
    parseStoredAvailability(value[0], fallback[0]),
    parseStoredAvailability(value[1], fallback[1]),
    parseStoredAvailability(value[2], fallback[2]),
    parseStoredAvailability(value[3], fallback[3]),
    parseStoredAvailability(value[4], fallback[4]),
  ];
}

function parseStoredAvailability(
  value: unknown,
  fallback: DayAvailability,
): DayAvailability {
  if (!isUnknownArray(value)) {
    return fallback;
  }

  return [
    parseStoredDate(value[0], fallback[0]),
    parseStoredDate(value[1], fallback[1]),
  ];
}

function parseStoredArrangement(value: unknown): CourseStorageShort[] {
  return isUnknownArray(value) ? value.filter(isCourseStorageShort) : [];
}

function parseStoredWorkspace(value: unknown): Maybe<Workspace> {
  if (!isRecord(value)) {
    return null;
  }

  return {
    courses: isUnknownArray(value["courses"])
      ? value["courses"].filter(isCourseStorage)
      : [],
    arrangements: isUnknownArray(value["arrangements"])
      ? value["arrangements"].map(parseStoredArrangement)
      : [],
    arrangementIdx:
      typeof value["arrangementIdx"] === "number"
        ? value["arrangementIdx"]
        : null,
    availableTimes: parseStoredAvailableTimes(value["availableTimes"]),
  };
}

function defaultWorkspaces(): Workspace[] {
  return Array.from({ length: 5 }, () => emptyWorkspace());
}

function parseStoredWorkspaces(storedWorkspaces: string | null): Workspace[] {
  if (storedWorkspaces === null) {
    return defaultWorkspaces();
  }

  try {
    const parsed: unknown = JSON.parse(storedWorkspaces);
    if (!isUnknownArray(parsed)) {
      return defaultWorkspaces();
    }

    const workspaces = parsed.flatMap((value) => {
      const workspace = parseStoredWorkspace(value);
      return workspace === null ? [] : [workspace];
    });

    return workspaces.length > 0 ? workspaces : defaultWorkspaces();
  } catch {
    return defaultWorkspaces();
  }
}

function parseStoredWorkspaceIdx(
  storedWorkspaceIdx: string | null,
  workspaceCount: number,
): number {
  if (storedWorkspaceIdx === null) {
    return 0;
  }

  const parsed = Number(storedWorkspaceIdx);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < workspaceCount
    ? parsed
    : 0;
}

// credit to https://stackoverflow.com/a/58443076
const useReactPath = () => {
  const [path, setPath] = useState(window.location.pathname);
  const listenToPopstate = () => {
    const winPath = window.location.pathname;
    setPath(winPath);
  };
  useEffect(() => {
    window.addEventListener("popstate", listenToPopstate);
    return () => {
      window.removeEventListener("popstate", listenToPopstate);
    };
  }, []);
  return path;
};

/** Main wrapper */
function App() {
  // really basic routing
  const pathname = useReactPath();
  const realPath = pathname === "/" ? CURRENT_TERM : pathname;
  const [indexedCourses, setIndexedCourses] = useState<Maybe<CourseIndex>>(null);

  useEffect(() => {
    let cancelled = false;
    const courseDataUrl = courseDataUrls[realPath] ?? courseDataUrls[CURRENT_TERM];
    if (courseDataUrl === undefined) {
      throw new Error(`Missing course data URL for ${realPath}`);
    }

    setIndexedCourses(null);
    fetch(courseDataUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Course data returned ${response.status}`);
        }
        return response.json();
      })
      .then((data: unknown) => {
        if (!isCourseIndex(data)) {
          throw new Error("Course data response had an unexpected shape");
        }
        if (!cancelled) {
          setIndexedCourses(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          alert("Error loading course data");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [realPath]);

  // 5 blank workspaces by default bc I'm too lazy to implement dynamic tabs and stuff
  const localWorkspaces = localStorage.getItem("workspaces" + realPath);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() =>
    parseStoredWorkspaces(localWorkspaces),
  );
  const localWorkspaceIdx = localStorage.getItem("workspaceIdx" + realPath);
  const [workspaceIdx, setWorkspaceIdx] = useState<number>(() =>
    parseStoredWorkspaceIdx(localWorkspaceIdx, workspaces.length),
  );
  const [modalOpen, setModalOpen] = useState(false);

  const workspace = workspaces[workspaceIdx] ?? workspaces[0] ?? emptyWorkspace();
  const courses = workspace.courses;
  const availableTimes = useMemo(
    () => cloneAvailableTimes(workspace.availableTimes),
    [workspace.availableTimes],
  );
  const { arrangements, arrangementIdx } = workspace;

  // Save state to local storage
  useEffect(() => {
    localStorage.setItem("workspaces" + realPath, JSON.stringify(workspaces));
    localStorage.setItem(
      "workspaceIdx" + realPath,
      JSON.stringify(workspaceIdx),
    );
  }, [workspaces, workspaceIdx, realPath]);

  if (indexedCourses === null) {
    return (
      <main className="py-5 mx-2 antialiased">
        <p className="font-mono text-orange-500">Loading course data...</p>
      </main>
    );
  }

  /** Helper functions to be sent sent through Context */
  const replaceWorkspace = useCallback((updatedWorkspace: Workspace) => {
    setWorkspaces(setArrayIdx(workspaces, workspaceIdx, updatedWorkspace));
  }, [workspaces, workspaceIdx]);

  const addCourse = useCallback((newCourse: CourseStorage) => {
    const result = courses.find(
      (course) => course.courseData.id === newCourse.courseData.id,
    );
    let newCourses: CourseStorage[] = [];
    if (result) {
      // course was already in workspace
      newCourses = courses.map((course) =>
        course.courseData.id === newCourse.courseData.id ? newCourse : course,
      );
    } else {
      newCourses = [...courses, { ...newCourse, locked: true, sectionId: 0 }];
    }
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx: Maybe<number> = null;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
    } else {
      const lengthened = firstLengthenedArrangement(newArrangements, indexedCourses);
      newArrangementIdx = lengthened.arrangementIdx;
      newCourses = lengthened.courses;
    }
    // these happen in parallel
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangements: newArrangements,
      arrangementIdx: newArrangementIdx,
    });
  }, [availableTimes, courses, indexedCourses, replaceWorkspace, workspace]);

  const removeCourse = useCallback((course: CourseStorage) => {
    let newCourses = courses.filter((currCourse) => currCourse !== course);
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx: Maybe<number> = null;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
    } else {
      const lengthened = firstLengthenedArrangement(newArrangements, indexedCourses);
      newArrangementIdx = lengthened.arrangementIdx;
      newCourses = lengthened.courses;
    }
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangements: newArrangements,
      arrangementIdx: newArrangementIdx,
    });
  }, [availableTimes, courses, indexedCourses, replaceWorkspace, workspace]);

  const toggleCourse = useCallback((newCourse: CourseStorage) => {
    let toggledCourse = newCourse;
    let newCourses = courses.map((course) => {
      if (course.courseData.id === newCourse.courseData.id) {
        toggledCourse = { ...course, enabled: !course.enabled };
        return toggledCourse;
      } else {
        return course;
      }
    });
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx = arrangementIdx;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
      newArrangementIdx = null;
    } else {
      // if course went disabled => enabled or is unlocked, then need to recalculate
      // otherwise, just keep arrangementIdx the same
      if (toggledCourse.enabled || !toggledCourse.locked) {
        const lengthened = firstLengthenedArrangement(newArrangements, indexedCourses);
        newArrangementIdx = lengthened.arrangementIdx;
        newCourses = lengthened.courses;
      }
    }
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangements: newArrangements,
      arrangementIdx: newArrangementIdx,
    });
  }, [arrangementIdx, availableTimes, courses, indexedCourses, replaceWorkspace, workspace]);

  const toggleSectionLock = useCallback((newCourse: CourseStorage) => {
    let newCourses = courses.map((course) => {
      if (course.courseData.id === newCourse.courseData.id) {
        return { ...course, locked: !course.locked };
      } else {
        return course;
      }
    });
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx = arrangementIdx;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
      newArrangementIdx = null;
    } else {
      const lengthened = firstLengthenedArrangement(newArrangements, indexedCourses);
      newArrangementIdx = lengthened.arrangementIdx;
      newCourses = lengthened.courses;
    }
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangements: newArrangements,
      arrangementIdx: newArrangementIdx,
    });
  }, [arrangementIdx, availableTimes, courses, indexedCourses, replaceWorkspace, workspace]);

  const nextArrangement = useCallback(() => {
    let newIdx = workspace.arrangementIdx;
    if (workspace.arrangements.length === 0) {
      newIdx = null;
    } else if (workspace.arrangementIdx === null) {
      newIdx = 0;
    } else {
      newIdx = (workspace.arrangementIdx + 1) % workspace.arrangements.length;
    }
    const newArrangement =
      newIdx === null
        ? shortenCourses(workspace.courses)
        : (workspace.arrangements[newIdx] ?? shortenCourses(workspace.courses));
    const newCourses = lengthenCourses(newArrangement, indexedCourses);
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangementIdx: newIdx,
    });
  }, [indexedCourses, replaceWorkspace, workspace]);

  const prevArrangement = useCallback(() => {
    let newIdx = workspace.arrangementIdx;
    if (workspace.arrangements.length === 0) {
      newIdx = null;
    } else if (workspace.arrangementIdx === null) {
      newIdx = 0;
    } else {
      newIdx =
        (workspace.arrangements.length + workspace.arrangementIdx - 1) %
        workspace.arrangements.length;
    }
    const newArrangement =
      newIdx === null
        ? shortenCourses(workspace.courses)
        : (workspace.arrangements[newIdx] ?? shortenCourses(workspace.courses));
    const newCourses = lengthenCourses(newArrangement, indexedCourses);
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangementIdx: newIdx,
    });
  }, [indexedCourses, replaceWorkspace, workspace]);

  const setCourses = useCallback((nextCourses: CourseStorage[]) => {
    let newCourses = nextCourses;
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx: Maybe<number> = null;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
    } else {
      const lengthened = firstLengthenedArrangement(newArrangements, indexedCourses);
      newArrangementIdx = lengthened.arrangementIdx;
      newCourses = lengthened.courses;
    }
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangements: newArrangements,
      arrangementIdx: newArrangementIdx,
    });
  }, [availableTimes, indexedCourses, replaceWorkspace, workspace]);

  const setWorkspace = useCallback((idx: number) => {
    // invariant: previous idx is always valid
    let newIdx = workspaceIdx;
    if (idx >= 0 && idx < workspaces.length) {
      newIdx = idx;
    }
    setWorkspaceIdx(newIdx);
  }, [workspaceIdx, workspaces.length]);

  const updateAvailableTimes = useCallback((
    dayIdx: WeekdayIndex,
    isStart: boolean,
    day: Date,
  ) => {
    const [availableStart, availableEnd] = availableTimes[dayIdx];
    const newAvailableTimes = setAvailableTime(availableTimes, dayIdx, [
      isStart ? day : availableStart,
      isStart ? availableEnd : day,
    ]);
    let newCourses = courses;
    const newArrangements = generateCourseSections(
      newCourses,
      newAvailableTimes,
    );
    let newArrangementIdx = arrangementIdx;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
      newArrangementIdx = null;
    } else {
      const isWidening =
        (isStart && day < availableStart) || (!isStart && day > availableEnd);
      if (!isWidening || newArrangements.length !== arrangements.length) {
        const lengthened = firstLengthenedArrangement(newArrangements, indexedCourses);
        newArrangementIdx = lengthened.arrangementIdx;
        newCourses = lengthened.courses;
      }
    }
    // if current sections are invalid, jump to first valid one (or null everything)
    replaceWorkspace({
      ...workspace,
      courses: newCourses,
      arrangements: newArrangements,
      arrangementIdx: newArrangementIdx,
      availableTimes: newAvailableTimes,
    });
  }, [
    arrangementIdx,
    arrangements.length,
    availableTimes,
    courses,
    indexedCourses,
    replaceWorkspace,
    workspace,
  ]);

  const appStateValue = useMemo<AppStateProps>(
    () => ({
      workspaces,
      workspaceIdx,
      courses,
      addCourse,
      removeCourse,
      toggleCourse,
      setCourses,
      arrangements,
      arrangementIdx,
      nextArrangement,
      prevArrangement,
      availableTimes,
      updateAvailableTimes,
      setWorkspace,
      toggleSectionLock,
    }),
    [
      addCourse,
      arrangementIdx,
      arrangements,
      availableTimes,
      courses,
      nextArrangement,
      prevArrangement,
      removeCourse,
      setCourses,
      setWorkspace,
      toggleCourse,
      toggleSectionLock,
      updateAvailableTimes,
      workspaceIdx,
      workspaces,
    ],
  );

  return (
    <AllCourses.Provider value={indexedCourses}>
      <AppState.Provider value={appStateValue}>
        <div className="fixed z-[999] m-2">
          <motion.button
            whileHover={{ rotate: 15 }}
            className="h-8 w-8 rounded-full border-0 bg-white p-0"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <HelpOutlineIcon
              className="text-orange-500 bg-transparent"
              style={{ width: "auto", height: "auto" }}
            />
          </motion.button>
          <Modal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
            }}
          >
            <p>
              Add courses from the search bar. An entry will then appear in the
              workspace. You can click on the dropdown to select a section, and
              the class will appear on the calendar. You can enable and disable
              classes using the course toggle. To remove a class from your
              workspace, press the X button.
            </p>
            <p>
              In addition, this scheduler features an{" "}
              <em>automatic section selector</em> for your convenience. To use,
              simply unlock any number of courses in the workspace. This
              scheduler will then calculate all possible arrangements of
              sections for which none of the unlocked classes/sections will
              overlap. Use the left and right arrows to navigate these sections.
              The arrangements should automatically recalculate possible
              sections every time you enable/disable, lock/unlock, or add/remove
              a class. However, if a class is <em>locked</em>, we guarantee that
              the section number will not be changed.
            </p>
            <p>
              You can also limit sections be time. Above the calendar, you can
              change the allowed time range for any day of the week. The course
              scheduler should respect these times, and it will not generate
              arrangements with courses that start before the first time or end
              after the second. Note: If has a course doesn't have a time
              (marked as A), then the scheduler will leave it blank.
            </p>
            <p>
              We hope that this course schuduler makes your life easier! You can
              find the source code{" "}
              <Hyperlink
                href="https://github.com/rchalamala/caltech.dev"
                text="here"
              />
              .
            </p>
            <p>
              Pro tip: you can use data from previous terms by changing the url!
              For example, if you would like to revisit <b>Fa</b>ll of{" "}
              <b>2022-2023</b> (for whatever reason), simply navigate to
              https://caltech.dev/<b>fa2023</b>.
            </p>
          </Modal>
        </div>

        <main className="py-5 mx-2 antialiased scroll-smooth selection:bg-orange-400 selection:text-black">
          <div className="flex flex-col items-start md:flex-row">
            <div className="flex-1">
              <Planner />
            </div>
            <Workspace term={realPath.substring(1)} />
          </div>
        </main>

        <footer className="mx-auto flex flex-col justify-center gap-2.5 py-[30px] text-center">
          <p>
            Made with ❤️ by{" "}
            <Hyperlink href="https://github.com/rchalamala" text="Rahul" />,{" "}
            <Hyperlink href="https://github.com/ericlovesmath" text="Eric" />, &{" "}
            <Hyperlink href="https://github.com/zack466" text="Zack" />
          </p>
          <p>Current term: {realPath.substring(1)}</p>
        </footer>
      </AppState.Provider>
    </AllCourses.Provider>
  );
}

function Hyperlink(props: { href: string; text: string }) {
  return (
    <a
      className="font-mono font-bold text-orange-500 hover:underline"
      href={props.href}
      target="_blank"
      rel="noreferrer"
    >
      {props.text}
    </a>
  );
}

export default App;
