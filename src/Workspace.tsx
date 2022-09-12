import { useContext, useState } from "react";
import { AppState } from "./App";
import Modal from "./Modal";
import Select from "react-select";
import { SingleValue } from "react-select";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Fzf } from "fzf";
import Toggle from "react-toggle";
import Lock from "@mui/icons-material/Lock";
import LockOpen from "@mui/icons-material/LockOpen";
import RemoveIcon from '@mui/icons-material/Remove';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { shortenCourses, lengthenCourses } from "./App"

import "react-toggle/style.css";
import "./css/workspace.css";

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
    course.sectionId = newSection !== null ? course.courseData.sections.findIndex(s => s.number === newSection.number) : null;
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
            ? course.courseData.sections.find(c => c.number === course.courseData.sections[course.sectionId!].number)
            : null
        }
        onChange={onChange}
        options={course.courseData.sections}
        getOptionLabel={(section) => `${section.number}`}
        isOptionSelected={(section) => course.sectionId !== null ? section.number === course.courseData.sections[course.sectionId].number : false}
      />
    </div>
  );
}

function AdvancedCourseInfo(props: { course: CourseStorage }) {
  const course = props.course.courseData;
  return (
    <div>
      <b>{`${course.number}: ${course.name}`}</b>
      <p>{course.description}</p>
      <p>Prerequisites: {course.prerequisites || "None"}</p>
      <p>
        <a href={course.link} target="_blank" rel="noreferrer">
          TQFR rating
        </a>
        : {course.rating}
      </p>
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
          className={className}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="workspace-entry-buttons">
            <Toggle
              className="workspace-entry-toggle"
              icons={false}
              checked={course.enabled}
              onChange={() => {
                state.toggleCourse(course);
              }}
              />
            {course.locked ?
              <button onClick={() => state.toggleSectionLock(course)}><Lock style={{width: "auto", height: "auto"}}/></button> :
              <button onClick={() => state.toggleSectionLock(course)}><LockOpen style={{width: "auto", height: "auto"}}/></button>}
            <button
              className="workspace-entry-controls-remove"
              onClick={() => {
                state.removeCourse(course);
              }}
            >
              <RemoveIcon style={{width: "auto", height: "auto"}}/>
            </button>
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
              <button
                className="workspace-entry-controls-info"
                onClick={() => setInfoModalOpen(true)}
              >
                More Info
              </button>
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
  const allSectionsSet = -1 === state.courses.findIndex((c) => c.enabled && !c.locked)
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
          <ArrowBack style={{width: "auto", height: "auto"}}/>
        </button>
        <p className="workspace-scheduler-content">{`${displayIdx}/${total}`}</p>
        <button className="small-button" onClick={handleRight}>
          <ArrowForward style={{width: "auto", height: "auto"}}/>
        </button>
      </div>
    );
  }
}

function reorder<T>(
  list: Array<T>,
  startIndex: number,
  endIndex: number
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

  const removeAllClasses = () => {
    state.setCourses([]);
  };

  const unlockAllSections = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, locked: false };
      })
    );
  };

  const lockAllSections = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, locked: true };
      })
    );
  };

  const disableAllClasses = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, enabled: false };
      })
    );
  };

  const enableAllClasses = () => {
    state.setCourses(
      state.courses.map((course) => {
        return { ...course, enabled: true };
      })
    );
  };

  const setDefaultSchedule = () => {
    state.setCourses(
      ["Ma 1 a", "Ph 1 a", "Ch 1 a", "CS 1"].map(getCourse).map((course) => {
        return { ...course!, enabled: true, locked: true };
      })
    );
  };

  const exportWorkspace = () => {
    const shortened = shortenCourses(state.courses).map(c => [
      c.courseId,
      c.enabled,
      c.locked,
      c.sectionId,
    ]).flat()
    const code = window.btoa(JSON.stringify(shortened))
    navigator.clipboard.writeText(code)
    alert("Workspace code copied to clipboard.")
  }

  const importWorkspace = () => {
    const code = prompt("Copy in the workspace code.") || ""
    if (code === "") {
      return
    }
    try {
      const shortened = JSON.parse(window.atob(code))
      const courses: CourseStorageShort[] = []
      for (let i = 0; i * 4 < shortened.length; i++) {
        courses.push({
          courseId: shortened[i * 4],
          enabled: shortened[i * 4 + 1],
          locked: shortened[i * 4 + 2],
          sectionId: shortened[i * 4 + 3],
        })
      }
      const lengthened = lengthenCourses(courses)
      state.setCourses(lengthened)
    } catch {
      alert("Error importing workspace.")
    }
  }

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
      result.destination.index
    );

    state.setCourses(reorderedCourses);
  }

  return (
    <div className="workspace-wrapper">
      <div className="workspace-switcher">
        {[0, 1, 2, 3, 4].map((idx) => {
          return (
            <button
              key={idx}
              className={state.workspaceIdx === idx ? "enabled" : ""}
              onClick={() => state.setWorkspace(idx)}>
              {idx+1}
            </button>
          );
        })}
      </div>
      <WorkspaceScheduler />
      <div className="workspace-search">
        <WorkspaceSearch />
      </div>
      <div className="workspace-controls">
        <button onClick={unlockAllSections}>Unlock All</button>
        <button onClick={lockAllSections}>Lock All</button>
        <button onClick={enableAllClasses}>Enable All</button>
        <button onClick={disableAllClasses}>Disable All</button>
        <button onClick={setDefaultSchedule}>Default Schedule</button>
        <button onClick={importWorkspace}>Import Workspace</button>
        <button onClick={exportWorkspace}>Export Workspace</button>
        <button onClick={removeAllClasses}>Remove All</button>
      </div>
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
