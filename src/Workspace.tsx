import { useContext, useState } from "react";
import { AppState } from "./App";
import Modal, { useModal } from "./Modal";
import Select from "react-select";
import { SingleValue } from "react-select";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Fzf } from "fzf";
import Lock from "@mui/icons-material/Lock";
import LockOpen from "@mui/icons-material/LockOpen";
import Delete from "@mui/icons-material/Delete";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { shortenCourses, lengthenCourses } from "./App";
import { motion } from "framer-motion";

import "react-toggle/style.css";
import "./css/workspace.css";
import { IconButton, Switch } from "@mui/material";

const courses: CourseData[] = require("./data/TotalFall2022-23.json");

/** Fetches courses */
function getCourse(identifier: number | string): Maybe<CourseStorage> {
  let foundCourse: Maybe<CourseData> = null;

  if (typeof identifier === "number") {
    foundCourse = courses.find((course) => course.id === identifier) || null;
  } else {
    foundCourse =
      courses.find((course) => course.number === identifier) ||
      courses.find((course) => course.name === identifier) ||
      null;
  }

  if (foundCourse !== null) {
    return {
      courseData: foundCourse,
      sectionId: 0,
      enabled: true,
      locked: false,
    };
  }

  return null;
}

function SectionDropdown(props: { course: CourseStorage }) {
  const course = props.course;
  const state = useContext(AppState);

  const onChange = (newSection: SingleValue<Maybe<SectionData>>) => {
    course.sectionId =
      newSection !== null
        ? course.courseData.sections.findIndex(
          (s) => s.number === newSection.number,
        )
        : null;
    // if course with same id already exists, section number will simply be updated
    state.addCourse(course);
  };

  return (
    <div className="workspace-entry-section">
      <Select
        isClearable
        placeholder=""
        value={
          course.sectionId !== null
            ? course.courseData.sections.find(
              (c) =>
                c.number ===
                course.courseData.sections[course.sectionId!].number,
            )
            : null
        }
        onChange={onChange}
        options={course.courseData.sections}
        getOptionLabel={(section) => `${section.number}`}
        isOptionSelected={(section) =>
          course.sectionId !== null
            ? section.number ===
            course.courseData.sections[course.sectionId].number
            : false
        }
      />
    </div>
  );
}

function AdvancedCourseInfo(props: { course: CourseStorage }) {
  const course = props.course.courseData;
  return (
    <div className="flex flex-col space-y-2">
      <section>
        <h2 className="text-lg font-bold">{`${course.number}: ${course.name}`}</h2>
        <p>{course.description}</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Prerequisites</h2>
        <p>{course.prerequisites || "None"}</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Rating</h2>
        <p>
          <a
            className="font-bold text-orange-500 hover:underline"
            href={course.link}
            target="_blank"
            rel="noreferrer"
          >
            TQFR rating
          </a>
          : {course.rating}
        </p>
      </section>
    </div>
  );
}

interface WorkspaceEntryProps {
  course: CourseStorage;
  innerRef: any;
  provided: any;
  index: number;
}

/** Contains:
 - a large checkbox for easy enable/disable (or a toggle?)
 - change background color to easily tell if on/off
 - course name & section
 - an easy-to-use dropdown for switching sections
 - a delete button to remove from workspace
 - a "more info" button to show description and TQFR info */
function WorkspaceEntry(props: WorkspaceEntryProps) {
  const course = props.course;
  const sections = course.courseData.sections;
  const id = course.sectionId;

  const state = useContext(AppState);

  let className = "workspace-entry";
  className += course.locked
    ? " workspace-entry-locked"
    : " workspace-entry-unlocked";
  className += course.enabled
    ? " workspace-entry-enabled"
    : " workspace-entry-disabled";

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  return (
    <Draggable draggableId={`${course.courseData.id}`} index={props.index}>
      {(provided) => (
        <div
          className={`${className} bg-white shadow-lg border-0 ${course.locked && "bg-neutral-100"
            }`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="workspace-entry-buttons">
            <Switch
              color="warning"
              checked={course.enabled}
              onChange={() => {
                state.toggleCourse(course);
              }}
            />

            {course.locked ? (
              <IconButton
                color="warning"
                onClick={() => state.toggleSectionLock(course)}
              >
                <Lock className="" />
              </IconButton>
            ) : (
              <IconButton onClick={() => state.toggleSectionLock(course)}>
                <LockOpen />
              </IconButton>
            )}
            <IconButton
              color="error"
              className="workspace-entry-controls-remove"
              onClick={() => {
                state.removeCourse(course);
              }}
            >
              <Delete />
            </IconButton>
          </div>
          <div className="workspace-entry-content">
            <div className="workspace-entry-info">
              <p>
                <b>{course.courseData.number}</b>
                {": "}
                <b>{course.courseData.name}</b>{" "}
                {`(${course.courseData.units[0]}-${course.courseData.units[1]}-${course.courseData.units[2]})`}
              </p>
              <p>
                {id !== null ? sections[id].instructor : "No Section Selected"}
              </p>
              <p>{id !== null ? sections[id].locations : "Location"}</p>
              <p>{id !== null ? sections[id].times : "Times"}</p>
            </div>
            <div className="workspace-entry-controls">
              <motion.button
                whileHover={{ scale: 0.95 }}
                whileTap={{ scale: 0.9 }}
                className="py-1 font-bold text-white bg-orange-500 rounded-md workspace-entry-controls-info"
                onClick={() => setInfoModalOpen(true)}
              >
                More Info
              </motion.button>
              <Modal
                isOpen={infoModalOpen}
                onClose={() => setInfoModalOpen(false)}
              >
                <AdvancedCourseInfo course={props.course} />
              </Modal>
              <SectionDropdown course={course} />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function WorkspaceSearch() {
  const [options, setOptions] = useState(courses);
  const [selectedCourse, setCourse] = useState<Maybe<CourseData>>(null);
  const state = useContext(AppState);

  const handleSelect = (courseData: SingleValue<CourseData>) => {
    setCourse(courseData as CourseData);
    if (courseData) {
      state.addCourse({
        courseData: courseData,
        sectionId: null,
        enabled: true,
        locked: false,
      });
      setCourse(null);
    }
  };

  const fzf = new Fzf(courses, {
    selector: (item) => `${item.number} ${item.name}`,
  });

  const sortCourses = (input: string) => {
    setOptions(fzf.find(input).map((item) => item.item));
  };

  return (
    <Select
      isClearable
      placeholder="Add a course..."
      options={options}
      value={selectedCourse}
      getOptionLabel={(course) => `${course?.number} - ${course?.name}`}
      onChange={handleSelect}
      isOptionSelected={(course) => course.id === selectedCourse?.id}
      onInputChange={sortCourses}
      filterOption={() => {
        return true;
      }}
    />
  );
}

function WorkspaceScheduler() {
  const state = useContext(AppState);

  const handleLeft = () => {
    state.prevArrangement();
  };
  const handleRight = () => {
    state.nextArrangement();
  };

  const total = state.arrangements.length;
  const displayIdx =
    state.arrangementIdx !== null ? state.arrangementIdx + 1 : 0;

  // true if can't find a single enabled+unlocked sections
  const allSectionsSet =
    -1 === state.courses.findIndex((c) => c.enabled && !c.locked);
  if (allSectionsSet) {
    return (
      <div className="workspace-scheduler">
        <p>All sections set.</p>
      </div>
    );
  } else if (total === 0) {
    return (
      <div className="workspace-scheduler">
        <p>No arrangements found :(</p>
      </div>
    );
  } else {
    return (
      <div className="workspace-scheduler">
        <button className="small-button" onClick={handleLeft}>
          <ArrowBack style={{ width: "auto", height: "auto" }} />
        </button>
        <p className="workspace-scheduler-content">{`${displayIdx}/${total}`}</p>
        <button className="small-button" onClick={handleRight}>
          <ArrowForward style={{ width: "auto", height: "auto" }} />
        </button>
      </div>
    );
  }
}

function reorder<T>(
  list: Array<T>,
  startIndex: number,
  endIndex: number,
): Array<T> {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

/** A component that provides UI for searching/adding/removing courses
A fuzzy searcher will show you a limited selection of courses
Clicking on the course will add it to the workspace and enable it (there will also be a button to show more info)
From the workspace, you can enable/disable courses in addition to switching the section number */
// TODO: import/export classes in plaintext or a human-readable format
export default function Workspace() {
  const state = useContext(AppState);

  const workspaceEntries = (provided: any) =>
    state.courses.map((course: CourseStorage, index: number) => (
      <WorkspaceEntry
        index={index}
        innerRef={provided.innerRef}
        provided={provided}
        course={course}
        key={course.courseData.id}
      />
    ));

  let units = [0, 0, 0];
  for (let i = 0; i < state.courses.length; ++i) {
    if (state.courses[i].enabled) {
      units[0] += state.courses[i].courseData.units[0];
      units[1] += state.courses[i].courseData.units[1];
      units[2] += state.courses[i].courseData.units[2];
    }
  }

  const removeAllClasses = () => {
    state.setCourses([]);
  };

  const unlockAllSections = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, locked: false };
      }),
    );
  };

  const lockAllSections = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, locked: true };
      }),
    );
  };

  const disableAllClasses = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, enabled: false };
      }),
    );
  };

  const enableAllClasses = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, enabled: true };
      }),
    );
  };

  const setDefaultSchedule = () => {
    state.setCourses(
      ["Ma 1 a", "Ph 1 a", "Ch 1 a", "CS 1"].map(getCourse).map((course) => {
        return { ...course!, enabled: true, locked: true };
      }),
    );
  };

  const [openExportModal, exportModal] = useModal((props) => {
    const shortened = shortenCourses(state.courses)
      .map((c) => [c.courseId, c.enabled, c.locked, c.sectionId])
      .flat();
    const code = window.btoa(JSON.stringify(shortened));
    const copy = () => {
      navigator.clipboard.writeText(code);
    };
    return (
      <div className="export-modal">
        <p className="text-lg font-bold">Your workspace code is:</p>
        <p className="font-mono text-sm" style={{ wordBreak: "break-all" }}>
          {code}
        </p>
        <motion.button
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          className="flex px-4 py-2 space-x-2 font-bold border-2 rounded-md"
          onClick={copy}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>

          <p>Copy To Clipboard</p>
        </motion.button>
      </div>
    );
  });

  const importWorkspace = () => {
    const code = prompt("Copy in the workspace code.") || "";
    if (code === "") {
      return;
    }
    try {
      const shortened = JSON.parse(window.atob(code));
      const courses: CourseStorageShort[] = [];
      for (let i = 0; i * 4 < shortened.length; i++) {
        courses.push({
          courseId: shortened[i * 4],
          enabled: shortened[i * 4 + 1],
          locked: shortened[i * 4 + 2],
          sectionId: shortened[i * 4 + 3],
        });
      }
      const lengthened = lengthenCourses(courses);
      state.setCourses(lengthened);
    } catch {
      alert("Error importing workspace.");
    }
  };

  function onDragEnd(result: any) {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const reorderedCourses = reorder(
      state.courses,
      result.source.index,
      result.destination.index,
    );

    state.setCourses(reorderedCourses);
  }

  return (
    <div className="workspace-wrapper">
      {exportModal}
      <h2 className="mb-2 text-center">Choose Workspace...</h2>
      <div className="workspace-switcher">
        {[0, 1, 2, 3, 4].map((idx) => {
          return (
            <button
              key={idx}
              className={state.workspaceIdx === idx ? "enabled" : ""}
              onClick={() => state.setWorkspace(idx)}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <WorkspaceScheduler />
      <div className="workspace-search">
        <WorkspaceSearch />
      </div>
      <div className="workspace-controls">
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={unlockAllSections}
        >
          Unlock All
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={lockAllSections}
        >
          Lock All
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={enableAllClasses}
        >
          Enable All
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={disableAllClasses}
        >
          Disable All
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={setDefaultSchedule}
        >
          Default Schedule
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={importWorkspace}
        >
          Import Workspace
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={openExportModal}
        >
          Export Workspace
        </motion.button>
        <motion.button
          className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          onClick={removeAllClasses}
        >
          Remove All
        </motion.button>
      </div>
      <b className="workspace-units">
        {units[0] +
          units[1] +
          units[2] +
          " units (" +
          units[0] +
          "-" +
          units[1] +
          "-" +
          units[2] +
          ")"}
      </b>
      <div className="workspace-entries">
        {state.courses.length === 0 ? (
          <p style={{ margin: "auto" }}>
            No courses added. Add some using the search bar above!
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {workspaceEntries(provided)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
