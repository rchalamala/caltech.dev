import { useState } from "react";
import Dialog from "@mui/material/Dialog";

export interface ModalProps {
  isOpen: boolean;
  onClose: any;
  children: any;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      slotProps={{
        paper: {
          className:
            "relative flex flex-col space-y-4 bg-white p-16 rounded-md border-[1px] shadow-lg sm:w-[40%] w-[80%]",
          sx: { maxWidth: "none", margin: 0 },
        },
        backdrop: {
          sx: {
            backdropFilter: "blur(16px)",
            backgroundColor: "transparent",
          },
        },
      }}
    >
      {children}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute p-0 m-0 font-bold text-white bg-red-500 rounded-full top-2 right-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-10 h-10"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </Dialog>
  );
}

export type ModalReturn = [() => void, React.JSX.Element];

export function useModal(
  contents: (props: ModalProps) => React.JSX.Element,
): ModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => {
    setIsOpen(false);
  };
  return [
    () => setIsOpen(true),
    <Modal key="modal" isOpen={isOpen} onClose={onClose}>
      {contents({ isOpen, onClose, children: null })}
    </Modal>,
  ];
}

export default Modal;
