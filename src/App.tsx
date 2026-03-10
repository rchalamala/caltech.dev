import { useEffect, useState, createContext } from "react";
import { Routes, Route, Navigate, useParams, Link } from "react-router";
import Planner from "./Planner";
import WorkspacePanel from "./Workspace";
import Modal from "./Modal";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { motion } from "framer-motion";
import {
  DEFAULT_TERM_PATH,
  getSupportedTermPaths,
  isSupportedTermPath,
  loadTermCourseData,
} from "./lib/termData";
import { useWorkspaceState, WorkspaceStateAPI } from "./hooks/useWorkspaceState";
import {
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  Maybe,
  Workspace as WorkspaceState,
  AvailableTimes,
} from "./types";
import { createEmptyWorkspace } from "./lib/scheduling";

export const AllCourses = createContext<CourseIndex>({});

export interface AppStateProps {
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

/* ------------------------------------------------------------------ */
/*  TermPage — loads data for a specific term and renders the app     */
/* ------------------------------------------------------------------ */

function TermPage() {
  const { term } = useParams<{ term: string }>();
  const termPath = `/${(term ?? "").toLowerCase()}`;

  const [courseDataState, setCourseDataState] = useState<{
    termPath: string;
    data: CourseIndex;
    error: string | null;
  }>({ termPath: "", data: {}, error: null });

  const indexedCourses =
    courseDataState.termPath === termPath ? courseDataState.data : {};
  const dataLoadError =
    courseDataState.termPath === termPath ? courseDataState.error : null;
  const isLoadingCourses = courseDataState.termPath !== termPath;

  useEffect(() => {
    let cancelled = false;

    loadTermCourseData(termPath)
      .then((courseData) => {
        if (cancelled) return;
        setCourseDataState({ termPath, data: courseData, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCourseDataState({
          termPath,
          data: {},
          error:
            error instanceof Error
              ? error.message
              : "Unable to load course data.",
        });
      });

    return () => { cancelled = true; };
  }, [termPath]);

  const workspaceState: WorkspaceStateAPI = useWorkspaceState(
    termPath,
    indexedCourses,
  );

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AllCourses.Provider value={indexedCourses}>
      <AppState.Provider value={workspaceState}>
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
              <p>Term: {term}</p>
            </div>
          ) : dataLoadError ? (
            <ErrorPage term={term ?? ""} error={dataLoadError} />
          ) : (
            <div id="column-container">
              <div className="column planner-column">
                <Planner />
              </div>
              <WorkspacePanel term={term ?? ""} />
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
          <p>Current term: {term}</p>
        </footer>
      </AppState.Provider>
    </AllCourses.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorPage                                                         */
/* ------------------------------------------------------------------ */

function ErrorPage({ term, error }: { term: string; error?: string }) {
  const supportedTerms = getSupportedTermPaths();
  const pathname = `/${term}`;

  return (
    <div className="py-16 text-center space-y-4">
      <p className="text-2xl font-bold">
        Unable to load course data for {term}
      </p>
      {error && <p>{error}</p>}
      {!isSupportedTermPath(pathname) && (
        <p className="text-sm text-neutral-600">
          Supported terms: {supportedTerms.join(", ")}
        </p>
      )}
      <p>
        Try the{" "}
        <Link
          className="font-mono font-bold text-orange-500 hover:underline"
          to={DEFAULT_TERM_PATH}
        >
          {DEFAULT_TERM_PATH.substring(1)}
        </Link>{" "}
        term instead.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NotFoundPage — catch-all for unrecognized routes                  */
/* ------------------------------------------------------------------ */

function NotFoundPage() {
  const pathname = window.location.pathname;
  const term = pathname.substring(1) || "unknown";
  return (
    <div className="py-5 mx-2 antialiased">
      <ErrorPage term={term} />
      <footer className="footer">
        <p>
          Made with ❤️ by{" "}
          <Hyperlink href="https://github.com/rchalamala" text="Rahul" />,{" "}
          <Hyperlink href="https://github.com/ericlovesmath" text="Eric" />, &{" "}
          <Hyperlink href="https://github.com/zack466" text="Zack" />
        </p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App — route definitions                                           */
/* ------------------------------------------------------------------ */

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={DEFAULT_TERM_PATH} replace />} />
      <Route path="/:term" element={<TermPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                 */
/* ------------------------------------------------------------------ */

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
