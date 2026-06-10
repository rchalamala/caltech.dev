import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  AppStateProps,
  emptyWorkspace,
  lengthenCourses,
  shortenCourses,
} from "./appContext";
import { generateCourseSections } from "./scheduler";
import { CURRENT_TERM, courseDataSources } from "./courseData";

function setArrayIdx<T>(arr: Array<T>, idx: number, element: T) {
  return arr.map((value, i) => {
    if (i === idx) {
      return element;
    } else {
      return value;
    }
  });
}

function setField(obj: any, field: string, value: any) {
  return {
    ...obj,
    [field]: value,
  };
}

// credit to https://stackoverflow.com/a/58443076
function useReactPath() {
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
}

export function useAppState(): {
  realPath: string;
  indexedCourses: CourseIndex;
  appStateValue: AppStateProps;
} {
  // really basic routing
  const pathname = useReactPath();
  const realPath = pathname === "/" ? CURRENT_TERM : pathname;
  const indexedCourses: CourseIndex = useMemo(
    () => courseDataSources[realPath] ?? {},
    [realPath],
  );

  // 5 blank workspaces by default bc I'm too lazy to implement dynamic tabs and stuff
  const defaultWorkspaces = useMemo(
    () => [
      emptyWorkspace(),
      emptyWorkspace(),
      emptyWorkspace(),
      emptyWorkspace(),
      emptyWorkspace(),
    ],
    [],
  );
  const [workspaces, setWorkspaces] = useLocalStorage<Workspace[]>(
    "workspaces" + realPath,
    defaultWorkspaces,
  );
  const [workspaceIdx, setWorkspaceIdx] = useLocalStorage<number>(
    "workspaceIdx" + realPath,
    0,
  );

  const courses = workspaces[workspaceIdx].courses;
  const availableTimes: Date[][] = useMemo(
    () =>
      workspaces[workspaceIdx].availableTimes.map(([start, end]) => [
        new Date(start),
        new Date(end),
      ]),
    [workspaces, workspaceIdx],
  );

  const { arrangements, arrangementIdx } = workspaces[workspaceIdx];

  /** Helper functions to be sent sent through Context */
  const addCourse = useCallback(
    (newCourse: CourseStorage) => {
      const result = courses.find(
        (course) => course.courseData.id === newCourse.courseData.id,
      );
      let newCourses: CourseStorage[] = [];
      if (result) {
        // course was already in workspace
        newCourses = courses;
      } else {
        newCourses = [
          ...courses,
          setField(setField(newCourse, "locked", true), "sectionId", 0),
        ];
      }
      const newArrangements = generateCourseSections(
        newCourses,
        availableTimes,
      );
      let newArrangementIdx = null;
      if (newArrangements.length === 0) {
        newCourses = newCourses.map((course) => {
          if (!course.locked) {
            return setField(course, "sectionId", null);
          } else {
            return course;
          }
        });
      } else {
        newArrangementIdx = 0;
        newCourses = lengthenCourses(
          newArrangements[newArrangementIdx],
          indexedCourses,
        );
      }
      // these happen in parallel
      setWorkspaces(
        setArrayIdx(workspaces, workspaceIdx, {
          ...workspaces[workspaceIdx],
          courses: newCourses,
          arrangements: newArrangements,
          arrangementIdx: newArrangementIdx,
        }),
      );
    },
    [
      courses,
      availableTimes,
      workspaces,
      workspaceIdx,
      indexedCourses,
      setWorkspaces,
    ],
  );

  const removeCourse = useCallback(
    (course: CourseStorage) => {
      let newCourses = courses.filter((currCourse) => currCourse !== course);
      const newArrangements = generateCourseSections(
        newCourses,
        availableTimes,
      );
      let newArrangementIdx = null;
      if (newArrangements.length === 0) {
        newCourses = newCourses.map((course) => {
          if (!course.locked) {
            return setField(course, "sectionId", null);
          } else {
            return course;
          }
        });
      } else {
        newArrangementIdx = 0;
        newCourses = lengthenCourses(
          newArrangements[newArrangementIdx],
          indexedCourses,
        );
      }
      setWorkspaces(
        setArrayIdx(workspaces, workspaceIdx, {
          ...workspaces[workspaceIdx],
          courses: newCourses,
          arrangements: generateCourseSections(newCourses, availableTimes),
          arrangementIdx: newArrangementIdx,
        }),
      );
    },
    [
      courses,
      availableTimes,
      workspaces,
      workspaceIdx,
      indexedCourses,
      setWorkspaces,
    ],
  );

  const toggleCourse = useCallback(
    (newCourse: CourseStorage) => {
      let newCourses = courses.map((course) => {
        if (course.courseData.id === newCourse.courseData.id) {
          newCourse.enabled = !newCourse.enabled;
          return newCourse;
        } else {
          return course;
        }
      });
      const newArrangements = generateCourseSections(
        newCourses,
        availableTimes,
      );
      let newArrangementIdx = arrangementIdx;
      if (newArrangements.length === 0) {
        newCourses = newCourses.map((course) => {
          if (!course.locked) {
            return setField(course, "sectionId", null);
          } else {
            return course;
          }
        });
        newArrangementIdx = null;
      } else {
        // if course went disabled => enabled or is unlocked, then need to recalculate
        // otherwise, just keep arrangementIdx the same
        if (newCourse.enabled || !newCourse.locked) {
          newArrangementIdx = 0;
          newCourses = lengthenCourses(
            newArrangements[newArrangementIdx],
            indexedCourses,
          );
        }
      }
      setWorkspaces(
        setArrayIdx(workspaces, workspaceIdx, {
          ...workspaces[workspaceIdx],
          courses: newCourses,
          arrangements: newArrangements,
          arrangementIdx: newArrangementIdx,
        }),
      );
    },
    [
      courses,
      availableTimes,
      arrangementIdx,
      workspaces,
      workspaceIdx,
      indexedCourses,
      setWorkspaces,
    ],
  );

  const toggleSectionLock = useCallback(
    (newCourse: CourseStorage) => {
      let newCourses = courses.map((course) => {
        if (course.courseData.id === newCourse.courseData.id) {
          newCourse.locked = !newCourse.locked;
          return newCourse;
        } else {
          return course;
        }
      });
      const newArrangements = generateCourseSections(
        newCourses,
        availableTimes,
      );
      let newArrangementIdx = arrangementIdx;
      if (newArrangements.length === 0) {
        newCourses = newCourses.map((course) => {
          if (!course.locked) {
            return setField(course, "sectionId", null);
          } else {
            return course;
          }
        });
        newArrangementIdx = null;
      } else {
        newArrangementIdx = 0;
        newCourses = lengthenCourses(
          newArrangements[newArrangementIdx],
          indexedCourses,
        );
      }
      setWorkspaces(
        setArrayIdx(workspaces, workspaceIdx, {
          ...workspaces[workspaceIdx],
          courses: newCourses,
          arrangements: newArrangements,
          arrangementIdx: newArrangementIdx,
        }),
      );
    },
    [
      courses,
      availableTimes,
      arrangementIdx,
      workspaces,
      workspaceIdx,
      indexedCourses,
      setWorkspaces,
    ],
  );

  const nextArrangement = useCallback(() => {
    const workspace = workspaces[workspaceIdx];
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
        : workspace.arrangements[newIdx!];
    const newCourses = lengthenCourses(newArrangement, indexedCourses);
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangementIdx: newIdx,
      }),
    );
  }, [workspaces, workspaceIdx, indexedCourses, setWorkspaces]);

  const prevArrangement = useCallback(() => {
    const workspace = workspaces[workspaceIdx];
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
        : workspace.arrangements[newIdx!];
    const newCourses = lengthenCourses(newArrangement, indexedCourses);
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangementIdx: newIdx,
      }),
    );
  }, [workspaces, workspaceIdx, indexedCourses, setWorkspaces]);

  const setCourses = useCallback(
    (courses: CourseStorage[]) => {
      let newCourses = courses;
      const newArrangements = generateCourseSections(
        newCourses,
        availableTimes,
      );
      let newArrangementIdx = null;
      if (newArrangements.length === 0) {
        newCourses = newCourses.map((course) => {
          if (!course.locked) {
            return setField(course, "sectionId", null);
          } else {
            return course;
          }
        });
      } else {
        newArrangementIdx = 0;
        newCourses = lengthenCourses(
          newArrangements[newArrangementIdx],
          indexedCourses,
        );
      }
      setWorkspaces(
        setArrayIdx(workspaces, workspaceIdx, {
          ...workspaces[workspaceIdx],
          courses: newCourses,
          arrangements: newArrangements,
          arrangementIdx: newArrangementIdx,
        }),
      );
    },
    [availableTimes, workspaces, workspaceIdx, indexedCourses, setWorkspaces],
  );

  const setWorkspace = useCallback(
    (idx: number) => {
      // invariant: previous idx is always valid
      let newIdx = workspaceIdx;
      if (idx >= 0 && idx < workspaces.length) {
        newIdx = idx;
      }
      setWorkspaceIdx(newIdx);
    },
    [workspaces, workspaceIdx, setWorkspaceIdx],
  );

  const updateAvailableTimes = useCallback(
    (dayIdx: number, isStart: boolean, day: Date) => {
      const newAvailableTimes = setArrayIdx(availableTimes, dayIdx, [
        isStart ? day : availableTimes[dayIdx][0],
        isStart ? availableTimes[dayIdx][1] : day,
      ]);
      let newCourses = courses;
      const newArrangements = generateCourseSections(
        newCourses,
        newAvailableTimes,
      );
      let newArrangementIdx = arrangementIdx;
      if (newArrangements.length === 0) {
        newCourses = newCourses.map((course) => {
          if (!course.locked) {
            return setField(course, "sectionId", null);
          } else {
            return course;
          }
        });
        newArrangementIdx = null;
      } else {
        const isWidening =
          (isStart && day < availableTimes[dayIdx][0]) ||
          (!isStart && day > availableTimes[dayIdx][1]);
        if (!isWidening || newArrangements.length !== arrangements.length) {
          newArrangementIdx = 0;
          newCourses = lengthenCourses(
            newArrangements[newArrangementIdx],
            indexedCourses,
          );
        }
      }
      // if current sections are invalid, jump to first valid one (or null everything)
      setWorkspaces(
        setArrayIdx(workspaces, workspaceIdx, {
          ...workspaces[workspaceIdx],
          courses: newCourses,
          arrangements: newArrangements,
          arrangementIdx: newArrangementIdx,
          availableTimes: newAvailableTimes,
        }),
      );
    },
    [
      courses,
      availableTimes,
      arrangements,
      arrangementIdx,
      workspaces,
      workspaceIdx,
      indexedCourses,
      setWorkspaces,
    ],
  );

  const appStateValue = useMemo(
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
    ],
  );

  return { realPath, indexedCourses, appStateValue };
}
