import { useEffect, useState, createContext } from "react";
import Planner from "./Planner";
import { parseTimes } from "./Planner";
import Workspace from "./Workspace";
import Modal from "./Modal";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { motion } from "framer-motion";

const indexedCourses: Record<
  string,
  CourseData
> = require("./data/IndexedTotalFall2022-23.json");

function emptyWorkspace() {
  return {
    courses: [],
    arrangements: [],
    arrangementIdx: null,
    availableTimes: [
      [new Date(2018, 0, 1, 8), new Date(2018, 0, 1, 23)],
      [new Date(2018, 0, 2, 8), new Date(2018, 0, 2, 23)],
      [new Date(2018, 0, 3, 8), new Date(2018, 0, 3, 23)],
      [new Date(2018, 0, 4, 8), new Date(2018, 0, 4, 23)],
      [new Date(2018, 0, 5, 8), new Date(2018, 0, 5, 23)],
    ],
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

  availableTimes: Date[][];
  updateAvailableTimes: (dayIdx: number, isStart: boolean, day: Date) => void;
}

/** Allows to easily add/remove courses to `state` */
// TODO: rename context (maybe to something like AppState or something)
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

function sectionsIntersect(a: CourseStorage, b: CourseStorage): boolean {
  if (!a.enabled || !b.enabled) {
    return false;
  }
  if (a.sectionId === null || b.sectionId === null) {
    return false;
  }
  const sectionA = a.courseData.sections.find(
    (s) => s.number === a.courseData.sections[a.sectionId!].number
  );
  const sectionB = b.courseData.sections.find(
    (s) => s.number === b.courseData.sections[b.sectionId!].number
  );

  const timesA = parseTimes(sectionA!.times);
  const timesB = parseTimes(sectionB!.times);

  for (let i = 0; i < 5; i++) {
    for (const intervalA of timesA[i]) {
      for (const intervalB of timesB[i]) {
        if (
          (intervalA!.start >= intervalB!.start &&
            intervalA!.start < intervalB!.end) ||
          (intervalB!.start >= intervalA!.start &&
            intervalB!.start < intervalA!.end)
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
  shortened: CourseStorageShort[]
): CourseStorage[] {
  return shortened.map((storage) => {
    return {
      courseData: indexedCourses[storage.courseId.toString()]!,
      sectionId: storage.sectionId,
      enabled: storage.enabled,
      locked: storage.locked,
    };
  });
}

/** Takes a list of course requests and generates a list of possible arrangements.
 One section from each class will be selected in an arrangement, and
 none of these sections will have overlapping times. */
function generateCourseSections(
  requests: CourseStorage[],
  availableTimes: Date[][]
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
        valid &&= !sectionsIntersect(arr[i], arr[j]);
      }
    }

    for (let i = 0; i < arr.length; i++) {
      if (arr[i].sectionId === null) {
        continue;
      }
      const section = arr[i].courseData.sections.find(
        (s) => s.number === arr[i].courseData.sections[arr[i].sectionId!].number
      );
      const intervals = parseTimes(section!.times);
      for (let j = 0; j < 5; j++) {
        for (const interval of intervals[j]) {
          valid &&=
            availableTimes[j][0].getTime() <= interval!.start.getTime() &&
            interval!.end.getTime() <= availableTimes[j][1].getTime();
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

    if (
      !request.enabled ||
      request.locked ||
      // ignore "A" courses to reduce the number of total arrangements
      (request.courseData.sections.length > 0 &&
        request.courseData.sections[0].times === "A")
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

/** Main wrapper */
function App() {
  // 5 blank workspaces by default bc I'm too lazy to implement dynamic tabs and stuff
  const localWorkspaces = localStorage.getItem("workspaces");
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    localWorkspaces
      ? JSON.parse(localWorkspaces)
      : [
          emptyWorkspace(),
          emptyWorkspace(),
          emptyWorkspace(),
          emptyWorkspace(),
          emptyWorkspace(),
        ]
  );
  const localWorkspaceIdx = localStorage.getItem("workspaceIdx");
  const [workspaceIdx, setWorkspaceIdx] = useState<number>(
    localWorkspaceIdx ? JSON.parse(localWorkspaceIdx) : 0
  );

  const courses = workspaces[workspaceIdx].courses;
  const availableTimes: Date[][] = [[], [], [], [], []];

  for (let i = 0; i < availableTimes.length; ++i) {
    for (let j = 0; j < 2; ++j) {
      availableTimes[i][j] = new Date(
        workspaces[workspaceIdx].availableTimes[i][j]
      );
    }
  }

  // Save state to local storage
  useEffect(() => {
    localStorage.setItem("workspaces", JSON.stringify(workspaces));
    localStorage.setItem("workspaceIdx", JSON.stringify(workspaceIdx));
  }, [workspaces, workspaceIdx]);

  /** Helper functions to be sent sent through Context */
  const addCourse = (newCourse: CourseStorage) => {
    const result = courses.find(
      (course) => course.courseData.id === newCourse.courseData.id
    );
    let newCourses: CourseStorage[] = [];
    if (result) {
      newCourses = courses.map((course) =>
        course.courseData.id === newCourse.courseData.id
          ? setField(newCourse, "locked", true)
          : course
      );
    } else {
      newCourses = [...courses, newCourse];
    }
    const newArrangements = generateCourseSections(newCourses, availableTimes);
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
      newCourses = lengthenCourses(newArrangements[newArrangementIdx]);
    }
    // these happen in parallel
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangements: newArrangements,
        arrangementIdx: newArrangementIdx,
      })
    );
  };

  const removeCourse = (course: CourseStorage) => {
    let newCourses = courses.filter((currCourse) => currCourse !== course);
    const newArrangements = generateCourseSections(newCourses, availableTimes);
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
      newCourses = lengthenCourses(newArrangements[newArrangementIdx]);
    }
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangements: generateCourseSections(newCourses, availableTimes),
        arrangementIdx: newArrangementIdx,
      })
    );
  };

  const toggleCourse = (newCourse: CourseStorage) => {
    let newCourses = courses.map((course) => {
      if (course.courseData.id === newCourse.courseData.id) {
        newCourse.enabled = !newCourse.enabled;
        return newCourse;
      } else {
        return course;
      }
    });
    const newArrangements = generateCourseSections(newCourses, availableTimes);
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
        newCourses = lengthenCourses(newArrangements[newArrangementIdx]);
      }
    }
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangements: newArrangements,
        arrangementIdx: newArrangementIdx,
      })
    );
  };

  const toggleSectionLock = (newCourse: CourseStorage) => {
    let newCourses = courses.map((course) => {
      if (course.courseData.id === newCourse.courseData.id) {
        newCourse.locked = !newCourse.locked;
        return newCourse;
      } else {
        return course;
      }
    });
    const newArrangements = generateCourseSections(newCourses, availableTimes);
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
      newCourses = lengthenCourses(newArrangements[newArrangementIdx]);
    }
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangements: newArrangements,
        arrangementIdx: newArrangementIdx,
      })
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
    const newCourses = lengthenCourses(newArrangement);
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangementIdx: newIdx,
      })
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
    const newCourses = lengthenCourses(newArrangement);
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangementIdx: newIdx,
      })
    );
  };

  const setCourses = (courses: CourseStorage[]) => {
    let newCourses = courses;
    const newArrangements = generateCourseSections(newCourses, availableTimes);
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
      newCourses = lengthenCourses(newArrangements[newArrangementIdx]);
    }
    setWorkspaces(
      setArrayIdx(workspaces, workspaceIdx, {
        ...workspaces[workspaceIdx],
        courses: newCourses,
        arrangements: newArrangements,
        arrangementIdx: newArrangementIdx,
      })
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
    day: Date
  ) => {
    const newAvailableTimes = setArrayIdx(availableTimes, dayIdx, [
      isStart ? day : availableTimes[dayIdx][0],
      isStart ? availableTimes[dayIdx][1] : day,
    ]);
    let newCourses = courses;
    const newArrangements = generateCourseSections(
      newCourses,
      newAvailableTimes
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
        newCourses = lengthenCourses(newArrangements[newArrangementIdx]);
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
      })
    );
  };

  const { arrangements, arrangementIdx } = workspaces[workspaceIdx];

  const [modalOpen, setModalOpen] = useState(false);

  return (
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
      <nav className="flex flex-col items-center justify-center py-8">
        <h1 className="font-serif text-3xl font-black">🦫 Beavered</h1>
        <p className="text-sm italic">
          The best Caltech course scheduler to exist
        </p>
        <div className="">
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
              <a
                href="https://github.com/rchalamala/beavered"
                target="_blank"
                rel="noreferrer"
              >
                here
              </a>
              .
            </p>
          </Modal>
        </div>
      </nav>
      <main className="">
        <div className="mx-8 my-10 antialiased scroll-smooth selection:bg-orange-400 selection:text-black">
          <div id="column-container">
            <div className="column planner-column">
              <Planner />
            </div>
            <Workspace />
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Made with ❤️ by{" "}
          <a
            className="font-mono font-bold text-orange-500 hover:underline"
            href="https://github.com/rchalamala"
            target="_blank"
            rel="noreferrer"
          >
            Rahul
          </a>
          ,{" "}
          <a
            className="font-mono font-bold text-orange-500 hover:underline"
            href="https://github.com/ericlovesmath"
            target="_blank"
            rel="noreferrer"
          >
            Eric
          </a>
          ,{" "}
          <a
            className="font-mono font-bold text-orange-500 hover:underline"
            href="https://github.com/zack466"
            target="_blank"
            rel="noreferrer"
          >
            Zack
          </a>
          , &{" "}
          <a
            className="font-mono font-bold text-orange-500 hover:underline"
            href="https://armeetjatyani.com"
            target="_blank"
            rel="noreferrer"
          >
            Armeet
          </a>
        </p>
      </footer>
    </AppState.Provider>
  );
}

export default App;
