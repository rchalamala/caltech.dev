import { useContext, useEffect, useMemo, useRef, useState } from "react";
import Modal, { useModal } from "./Modal";
import Select from "react-select";
import { SingleValue } from "react-select";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  DropResult,
  Droppable,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { Fzf } from "fzf";
import Lock from "@mui/icons-material/Lock";
import LockOpen from "@mui/icons-material/LockOpen";
import Delete from "@mui/icons-material/Delete";
import DragIndicator from "@mui/icons-material/DragIndicator";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { AllCourses, AppState } from "./App";
import { motion } from "framer-motion";
import { lengthenCourses, reorder, shortenCourses } from "./lib/scheduling";

import "./css/workspace.css";
import { Collapse, IconButton, Switch } from "@mui/material";
import { UnfoldLess, UnfoldMore } from "@mui/icons-material";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { exportICS } from "./lib/ics";
import { getCourseColorHSL } from "./lib/courseColor";
import {
  CourseData,
  CourseIndex,
  CourseStorage,
  CourseStorageShort,
  Maybe,
  SectionData,
} from "./types";

const DEFAULT_COURSES: { [key: string]: string[] } = {
  "fa": ["Ma 1 a", "Ph 1 a", "Ch 1 a", "CS 1"],
  "wi": ["Ma 1 b", "Ph 1 b", "Ch 1 b", "CS 2"],
  "sp": ["Ma 1 c", "Ph 1 c", "CS 3 x"],
};

/** Fetches courses */
function getCourse(
  identifier: number | string,
  indexedCourses: CourseIndex,
): Maybe<CourseStorage> {
  let foundCourse: Maybe<CourseData> = null;

  if (typeof identifier === "number") {
    foundCourse = indexedCourses[`${identifier}`] || null;
  } else {
    foundCourse =
      Object.values(indexedCourses).find(
        (course) => course.number === identifier,
      ) ||
      Object.values(indexedCourses).find(
        (course) => course.name === identifier,
      ) ||
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
    const sectionId =
      newSection !== null
        ? course.courseData.sections.findIndex(
            (s) => s.number === newSection.number,
          )
        : null;

    state.setCourses(
      state.courses.map((existingCourse) =>
        existingCourse.courseData.id === course.courseData.id
          ? { ...existingCourse, sectionId }
          : existingCourse,
      ),
    );
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
        getOptionLabel={(section) => {
          const time = section.times === "A" ? "TBD" : section.times;
          const parts = [`${section.number}`];
          if (section.instructor) parts.push(section.instructor);
          parts.push(time);
          return parts.join(" \u2014 ");
        }}
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
      <section>
        <h2 className="text-lg font-bold">Comments</h2>
        <p>{course.comment || "None"}</p>
      </section>
    </div>
  );
}

interface WorkspaceEntryProps {
  course: CourseStorage;
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

  const [expanded, setExpanded] = useState(true);
  const [animParent] = useAutoAnimate();

  let className = "workspace-entry";
  className += course.locked
    ? " workspace-entry-locked"
    : " workspace-entry-unlocked";
  className += course.enabled
    ? " workspace-entry-enabled"
    : " workspace-entry-disabled";

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  return (
    <div>
      <Draggable draggableId={`${course.courseData.id}`} index={props.index}>
        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
          <div
            className={`${className} bg-white shadow-lg border-0 ${
              course.locked && "bg-neutral-100"
            }`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{
              ...provided.draggableProps.style,
              borderLeft: `4px solid ${getCourseColorHSL(course.courseData.id)}`,
            }}
          >
            <div
              className={`relative w-full whitespace-nowrap ${snapshot.isDragging ? "workspace-entry-dragging" : ""}`}
              ref={animParent}
            >
              <div className="left-0 w-min align-middle inline-flex items-center">
                <IconButton
                  onClick={() => {
                    setExpanded(!expanded);
                  }}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${course.courseData.number}`}
                >
                  {expanded ? <UnfoldLess /> : <UnfoldMore />}
                </IconButton>
                <span
                  className="workspace-entry-drag-handle"
                  aria-label={`Reorder ${course.courseData.number}`}
                  title={`Reorder ${course.courseData.number}`}
                  {...provided.dragHandleProps}
                >
                  <DragIndicator fontSize="small" />
                </span>
              </div>
              {expanded ? (
                <></>
              ) : (
                <div className="align-middle inline-block max-w-[calc(100%-11rem)] items-center overflow-clip w-full whitespace-nowrap">
                  <span className="font-bold">{course.courseData.number}</span>{" "}
                  {course.courseData.name}
                </div>
              )}
              <div
                className={`${expanded ? "w-[calc(100%-2.5rem)]" : "w-min"} inline-block top-auto bottom-0 right-0 left-auto align-middle`}
              >
                <div className="workspace-entry-buttons">
                  <Switch
                    color="warning"
                    checked={course.enabled}
                    onChange={() => {
                      state.toggleCourse(course);
                    }}
                    inputProps={{
                      "aria-label": `${course.enabled ? "Disable" : "Enable"} ${course.courseData.number}`,
                    }}
                  />

                  {course.locked ? (
                    <IconButton
                      color="warning"
                      onClick={() => state.toggleSectionLock(course)}
                      aria-label={`Unlock ${course.courseData.number}`}
                    >
                      <Lock />
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={() => state.toggleSectionLock(course)}
                      aria-label={`Lock ${course.courseData.number}`}
                    >
                      <LockOpen />
                    </IconButton>
                  )}
                  <IconButton
                    color="error"
                    className="workspace-entry-controls-remove"
                    onClick={() => {
                      state.removeCourse(course);
                    }}
                    aria-label={`Remove ${course.courseData.number}`}
                  >
                    <Delete />
                  </IconButton>
                </div>
              </div>
            </div>
            <Collapse in={expanded} className="w-full">
              <div className="workspace-entry-content">
                <div className="workspace-entry-info">
                  <p>
                    <b>{course.courseData.number}</b>
                    {": "}
                    <b>{course.courseData.name}</b>{" "}
                    {`(${course.courseData.units[0]}-${course.courseData.units[1]}-${course.courseData.units[2]})`}
                  </p>
                  <p>
                    {id !== null
                      ? sections[id].instructor
                      : "No Section Selected"}
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
                  <SectionDropdown course={course} />
                </div>
              </div>
            </Collapse>
          </div>
        )}
      </Draggable>
      <Modal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <AdvancedCourseInfo course={course} />
      </Modal>
    </div>
  );
}

function WorkspaceSearch() {
  const state = useContext(AppState);
  const indexedCourses = useContext(AllCourses);
  const courses = useMemo(() => Object.values(indexedCourses), [indexedCourses]);
  const [options, setOptions] = useState<CourseData[]>(() => courses);

  const [selectedCourse, setCourse] = useState<Maybe<CourseData>>(null);

  useEffect(() => {
    setOptions(courses);
  }, [courses]);

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

  const fzf = useMemo(
    () =>
      new Fzf(courses, {
        selector: (item) => `${item.number} ${item.name}`,
      }),
    [courses],
  );

  const sortCourses = (input: string) => {
    setOptions(fzf.find(input).map((item) => item.item));
  };

  return (
    <Select
      isClearable
      className="my-3"
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
        <p>
          {state.courses.length > 0
            ? "All sections locked. Unlock courses to auto-find non-conflicting schedules."
            : "All sections set."}
        </p>
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
      <div className="workspace-scheduler" role="group" aria-label="Arrangement navigation">
        <button className="small-button" onClick={handleLeft} aria-label="Previous arrangement">
          <ArrowBack style={{ width: "auto", height: "auto" }} />
        </button>
        <p className="workspace-scheduler-content" aria-live="polite">{`${displayIdx}/${total}`}</p>
        <button className="small-button" onClick={handleRight} aria-label="Next arrangement">
          <ArrowForward style={{ width: "auto", height: "auto" }} />
        </button>
      </div>
    );
  }
}

/** A component that provides UI for searching/adding/removing courses
A fuzzy searcher will show you a limited selection of courses
Clicking on the course will add it to the workspace and enable it (there will also be a button to show more info)
From the workspace, you can enable/disable courses in addition to switching the section number */
// TODO: import/export classes in plaintext or a human-readable format
export default function Workspace({ term }: { term: string }) {
  const state = useContext(AppState);
  const indexedCourses = useContext(AllCourses);

  const units = [0, 0, 0];
  for (let i = 0; i < state.courses.length; ++i) {
    if (state.courses[i].enabled) {
      units[0] += state.courses[i].courseData.units[0];
      units[1] += state.courses[i].courseData.units[1];
      units[2] += state.courses[i].courseData.units[2];
    }
  }

  const [openExportModal, exportModal] = useModal(() => {
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

  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLTextAreaElement>(null);

  const [openImportModal, importModal] = useModal(() => {
    const handleImport = () => {
      const code = importInputRef.current?.value.trim() || "";
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
        const lengthened = lengthenCourses(courses, indexedCourses);
        state.setCourses(lengthened);
        setImportError(null);
      } catch {
        setImportError("Invalid workspace code. Please check and try again.");
      }
    };

    return (
      <div className="export-modal">
        <p className="text-lg font-bold">Paste your workspace code:</p>
        <textarea
          ref={importInputRef}
          className="w-full p-2 font-mono text-sm border rounded-md border-neutral-300"
          rows={4}
          placeholder="Paste workspace code here..."
        />
        {importError && (
          <p className="text-sm text-red-500">{importError}</p>
        )}
        <motion.button
          whileHover={{ scale: 0.95 }}
          whileTap={{ scale: 0.9 }}
          className="flex px-4 py-2 mx-auto space-x-2 font-bold border-2 rounded-md"
          onClick={handleImport}
        >
          <p>Import</p>
        </motion.button>
      </div>
    );
  });

  function onDragEnd(result: DropResult) {
    if (
      !result.destination ||
      result.destination.index === result.source.index
    ) {
      return;
    }

    state.setCourses(
      reorder(state.courses, result.source.index, result.destination.index),
    );
  }

  return (
    <div className="workspace-wrapper">
      {exportModal}
      {importModal}
      <h2 className="mb-2 text-center">Choose Workspace...</h2>
      <div
        className="workspace-switcher"
        role="tablist"
        aria-label="Workspace tabs"
        onKeyDown={(e) => {
          const current = state.workspaceIdx;
          let next = current;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            next = Math.min(current + 1, 4);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            next = Math.max(current - 1, 0);
          }
          if (next !== current) {
            state.setWorkspace(next);
            // Move focus to the newly selected tab
            const nextTab = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
              `#workspace-tab-${next}`,
            );
            nextTab?.focus();
          }
        }}
      >
        {[0, 1, 2, 3, 4].map((idx) => {
          const isSelected = state.workspaceIdx === idx;
          return (
            <button
              key={idx}
              role="tab"
              aria-selected={isSelected}
              aria-controls="workspace-tabpanel"
              id={`workspace-tab-${idx}`}
              tabIndex={isSelected ? 0 : -1}
              className={isSelected ? "enabled" : ""}
              onClick={() => state.setWorkspace(idx)}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="workspace-tabpanel"
        aria-labelledby={`workspace-tab-${state.workspaceIdx}`}
      >
      <WorkspaceScheduler />
      <WorkspaceSearch />
      <div className="workspace-controls">
        <ControlButton
          text="Unlock All"
          onClick={() => {
            state.setCourses(
              state.courses.map((c) => ({ ...c, locked: false })),
            );
          }}
        />
        <ControlButton
          text="Lock All"
          onClick={() => {
            state.setCourses(
              state.courses.map((course) => ({ ...course, locked: true })),
            );
          }}
        />
        <ControlButton
          text="Enable All"
          onClick={() => {
            state.setCourses(
              state.courses.map((course) => ({ ...course, enabled: true })),
            );
          }}
        />
        <ControlButton
          text="Disable All"
          onClick={() => {
            state.setCourses(
              state.courses.map((course) => ({ ...course, enabled: false })),
            );
          }}
        />
        <ControlButton text="Remove All" onClick={() => {
          if (state.courses.length === 0 || window.confirm("Remove all courses from this workspace?")) {
            state.setCourses([]);
          }
        }} />
        <ControlButton
          text="Default Schedule"
          onClick={() => {
            if (state.courses.length === 0 || window.confirm("Replace current courses with the default schedule?")) {
              state.setCourses(
                // Change based on term
                (DEFAULT_COURSES[term.substring(0, 2)] ?? []).map((name) => ({
                  ...getCourse(name, indexedCourses)!,
                  enabled: true,
                  locked: true,
                })),
              );
            }
          }}
        />
        <ControlButton text="Import Workspace" onClick={openImportModal} />
        <ControlButton text="Export Workspace" onClick={openExportModal} />
        <ControlButton text="Export .ics" onClick={() => {
          const icsContent = exportICS(term, state.courses);

          const blob = new Blob([icsContent], { type: 'text/calendar' });

          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `schedule_${term}.ics`;

          document.body.appendChild(link);
          link.click();
          URL.revokeObjectURL(link.href);
          document.body.removeChild(link);
        }} />
      </div>
      <b className="py-3">
        {`${units[0] + units[1] + units[2]} units (${units[0]}-${units[1]}-${units[2]})`}
      </b>
      <div className="workspace-entries">
        {state.courses.length === 0 ? (
          <p className="m-auto">
            No courses added. Add some using the search bar above!
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable">
              {(provided: DroppableProvided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {state.courses.map((course, index) => (
                    <WorkspaceEntry
                      index={index}
                      course={course}
                      key={course.courseData.id}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
      </div>{/* end tabpanel */}
    </div>
  );
}

function ControlButton(props: { text: string; onClick: () => void }) {
  return (
    <motion.button
      className="px-2 py-1 font-bold transition-colors duration-300 bg-white border-2 rounded-md border-neutral-500 text-neutral-500 hover:border-orange-500 active:border-orange-700 hover:text-orange-500 active:text-orange-700"
      whileHover={{ scale: 0.95 }}
      whileTap={{ scale: 0.9 }}
      onClick={props.onClick}
    >
      {props.text}
    </motion.button>
  );
}
