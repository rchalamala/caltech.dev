import { useState } from "react";
import { m } from "motion/react";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import Modal from "./Modal";
import Hyperlink from "./Hyperlink";

export default function HelpButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="fixed z-[999] m-2">
      <m.button
        type="button"
        aria-label="Help"
        whileHover={{ rotate: 15 }}
        className="h-8 w-8 rounded-full border-none bg-white p-0"
        onClick={() => setModalOpen(true)}
      >
        <HelpOutlinedIcon
          className="text-orange-500 bg-transparent"
          style={{ width: "auto", height: "auto" }}
        />
      </m.button>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <p>
          Add courses from the search bar. An entry will then appear in the
          workspace. You can click on the dropdown to select a section, and the
          class will appear on the calendar. You can enable and disable classes
          using the course toggle. To remove a class from your workspace, press
          the X button.
        </p>
        <p>
          In addition, this scheduler features an{" "}
          <em>automatic section selector</em> for your convenience. To use,
          simply unlock any number of courses in the workspace. This scheduler
          will then calculate all possible arrangements of sections for which
          none of the unlocked classes/sections will overlap. Use the left and
          right arrows to navigate these sections. The arrangements should
          automatically recalculate possible sections every time you
          enable/disable, lock/unlock, or add/remove a class. However, if a
          class is <em>locked</em>, we guarantee that the section number will
          not be changed.
        </p>
        <p>
          You can also limit sections be time. Above the calendar, you can
          change the allowed time range for any day of the week. The course
          scheduler should respect these times, and it will not generate
          arrangements with courses that start before the first time or end
          after the second. Note: If has a course doesn't have a time (marked as
          A), then the scheduler will leave it blank.
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
          Pro tip: you can use data from previous terms by changing the url! For
          example, if you would like to revisit <b>Fa</b>ll of <b>2022-2023</b>{" "}
          (for whatever reason), simply navigate to https://caltech.dev/
          <b>fa2023</b>.
        </p>
      </Modal>
    </div>
  );
}
