import { createContext } from "react";

export function emptyWorkspace(): Workspace {
  return {
    courses: [],
    arrangements: [],
    arrangementIdx: null,
    availableTimes: [
      [new Date(2025, 0, 1, 8), new Date(2025, 0, 1, 23)],
      [new Date(2025, 0, 2, 8), new Date(2025, 0, 2, 23)],
      [new Date(2025, 0, 3, 8), new Date(2025, 0, 3, 23)],
      [new Date(2025, 0, 4, 8), new Date(2025, 0, 4, 23)],
      [new Date(2025, 0, 5, 8), new Date(2025, 0, 5, 23)],
    ],
  };
}

export interface AppStateProps {
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

  availableTimes: Date[][];
  updateAvailableTimes: (dayIdx: number, isStart: boolean, day: Date) => void;
}

export const AllCourses = createContext<CourseIndex>({});

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

  availableTimes: [],
  updateAvailableTimes: () => null,
});

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
  return shortened.map((storage) => {
    return {
      courseData: courseIndex[storage.courseId.toString()]!,
      sectionId: storage.sectionId,
      enabled: storage.enabled,
      locked: storage.locked,
    };
  });
}
