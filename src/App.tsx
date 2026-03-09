import { useEffect, useState, createContext } from "react";
import Planner from "./Planner";
import WorkspacePanel from "./Workspace";
import Modal from "./Modal";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { motion } from "framer-motion";
import {
  createEmptyWorkspace,
  generateCourseSections,
  lengthenCourses,
  normalizeAvailableTime,
  normalizeAvailableTimes,
  shortenCourses,
} from "./lib/scheduling";
import {
  DEFAULT_TERM_PATH,
  getSupportedTermPaths,
  isSupportedTermPath,
  loadTermCourseData,
  resolveTermPath,
} from "./lib/termData";
import {
  AvailableTimes,
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  Maybe,
  Workspace as WorkspaceState,
} from "./types";

export const AllCourses = createContext<CourseIndex>({});

interface AppStateProps {
  workspaces: WorkspaceState[];
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

/** Allows to easily add/remove courses to `state` */
export const AppState = createContext<AppStateProps>({
  workspaces: [createEmptyWorkspace()],
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

function setArrayIdx<T>(arr: T[], idx: number, element: T): T[] {
  return arr.map((value, i) => {
    if (i === idx) {
      return element;
    } else {
      return value;
    }
  });
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
  const realPath = resolveTermPath(pathname);
  const [courseDataState, setCourseDataState] = useState<{
    termPath: string;
    data: CourseIndex;
    error: string | null;
  }>({
    termPath: "",
    data: {},
    error: null,
  });

  const indexedCourses = courseDataState.termPath === realPath
    ? courseDataState.data
    : {};
  const dataLoadError =
    courseDataState.termPath === realPath ? courseDataState.error : null;
  const isLoadingCourses = courseDataState.termPath !== realPath;

  useEffect(() => {
    let cancelled = false;

    loadTermCourseData(realPath)
      .then((courseData) => {
        if (cancelled) {
          return;
        }

        setCourseDataState({
          termPath: realPath,
          data: courseData,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setCourseDataState({
          termPath: realPath,
          data: {},
          error:
            error instanceof Error
              ? error.message
              : "Unable to load course data.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [realPath]);

  // 5 blank workspaces by default bc I'm too lazy to implement dynamic tabs and stuff
  const localWorkspaces = localStorage.getItem("workspaces" + realPath);
  const [workspaces, setWorkspaces] = useState<WorkspaceState[]>(
    localWorkspaces
      ? JSON.parse(localWorkspaces)
      : [
          createEmptyWorkspace(),
          createEmptyWorkspace(),
          createEmptyWorkspace(),
          createEmptyWorkspace(),
          createEmptyWorkspace(),
      ],
  );
  const localWorkspaceIdx = localStorage.getItem("workspaceIdx" + realPath);
  const [workspaceIdx, setWorkspaceIdx] = useState<number>(
    localWorkspaceIdx ? JSON.parse(localWorkspaceIdx) : 0,
  );

  const courses = workspaces[workspaceIdx].courses;
  const availableTimes = normalizeAvailableTimes(
    workspaces[workspaceIdx].availableTimes.map(([start, end]) => [
      new Date(start),
      new Date(end),
    ]),
  );

  // Save state to local storage
  useEffect(() => {
    localStorage.setItem("workspaces" + realPath, JSON.stringify(workspaces));
    localStorage.setItem(
      "workspaceIdx" + realPath,
      JSON.stringify(workspaceIdx),
    );
  }, [workspaces, workspaceIdx, realPath]);

  const clearUnlockedSections = (courseList: CourseStorage[]) =>
    courseList.map((course) =>
      course.locked ? course : { ...course, sectionId: null },
    );

  /** Helper functions to be sent sent through Context */
  const addCourse = (newCourse: CourseStorage) => {
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
        { ...newCourse, locked: true, sectionId: 0 },
      ];
    }
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx: Maybe<number> = null;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
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
  };

  const removeCourse = (course: CourseStorage) => {
    let newCourses = courses.filter(
      (currCourse) => currCourse.courseData.id !== course.courseData.id,
    );
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx: Maybe<number> = null;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
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
  };

  const toggleCourse = (newCourse: CourseStorage) => {
    const updatedCourse = { ...newCourse, enabled: !newCourse.enabled };
    let newCourses = courses.map((course) => {
      if (course.courseData.id === updatedCourse.courseData.id) {
        return updatedCourse;
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
      if (updatedCourse.enabled || !updatedCourse.locked) {
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
  };

  const toggleSectionLock = (newCourse: CourseStorage) => {
    const updatedCourse = { ...newCourse, locked: !newCourse.locked };
    let newCourses = courses.map((course) => {
      if (course.courseData.id === updatedCourse.courseData.id) {
        return updatedCourse;
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
  };

  const nextArrangement = () => {
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
  };

  const prevArrangement = () => {
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
  };

  const setCourses = (courses: CourseStorage[]) => {
    let newCourses = courses;
    const newArrangements = generateCourseSections(newCourses, availableTimes);
    let newArrangementIdx: Maybe<number> = null;
    if (newArrangements.length === 0) {
      newCourses = clearUnlockedSections(newCourses);
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
  };

  const setWorkspace = (idx: number) => {
    // invariant: previous idx is always valid
    let newIdx = workspaceIdx;
    if (idx >= 0 && idx < workspaces.length) {
      newIdx = idx;
    }
    setWorkspaceIdx(newIdx);
  };

  const updateAvailableTimes = (
    dayIdx: number,
    isStart: boolean,
    day: Date,
  ) => {
    const normalizedDay = normalizeAvailableTime(dayIdx, day);
    const newAvailableTimes: AvailableTimes = setArrayIdx(availableTimes, dayIdx, [
      isStart ? normalizedDay : availableTimes[dayIdx][0],
      isStart ? availableTimes[dayIdx][1] : normalizedDay,
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
        (isStart && normalizedDay < availableTimes[dayIdx][0]) ||
        (!isStart && normalizedDay > availableTimes[dayIdx][1]);
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
  };

  const { arrangements, arrangementIdx } = workspaces[workspaceIdx];

  const [modalOpen, setModalOpen] = useState(false);
  const supportedTerms = getSupportedTermPaths();

  return (
    <AllCourses.Provider value={indexedCourses}>
      <AppState.Provider
        value={{
          workspaces,
          workspaceIdx,
          courses: courses,
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
        }}
      >
        <div className="sticky-help">
          <motion.button
            whileHover={{ rotate: 15 }}
            className="help-button"
            onClick={() => setModalOpen(true)}
          >
            <HelpOutlineIcon
              className="text-orange-500 bg-transparent"
              style={{ width: "auto", height: "auto" }}
            />
          </motion.button>
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
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
          {isLoadingCourses ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-2xl font-bold">Loading course data…</p>
              <p>Term: {realPath.substring(1)}</p>
            </div>
          ) : dataLoadError ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-2xl font-bold">
                Unable to load course data for {realPath.substring(1)}
              </p>
              <p>{dataLoadError}</p>
              {!isSupportedTermPath(pathname) && (
                <p className="text-sm text-neutral-600">
                  Supported terms: {supportedTerms.join(", ")}
                </p>
              )}
              <p>
                Try the{" "}
                <a
                  className="font-mono font-bold text-orange-500 hover:underline"
                  href={DEFAULT_TERM_PATH}
                >
                  {DEFAULT_TERM_PATH.substring(1)}
                </a>{" "}
                term instead.
              </p>
            </div>
          ) : (
            <div id="column-container">
              <div className="column planner-column">
                <Planner />
              </div>
              <WorkspacePanel term={realPath.substring(1)} />
            </div>
          )}
        </main>

        <footer className="footer">
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
