import {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

import "./css/modal.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Focus management: save trigger, focus dialog on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;

      // Wait for animation to mount, then focus the dialog
      const timer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Keyboard handler: Escape to close, Tab trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: cycle Tab within the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="overflow-y-scroll flex items-center justify-center w-screen h-screen backdrop-blur-lg fixed top-0 left-0 z-[1000]"
          role="dialog"
          aria-modal="true"
          onKeyDown={handleKeyDown}
        >
          <button
            className="w-full h-full z-[500] absolute top-0 left-0"
            onClick={onClose}
            aria-label="Close dialog"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            exit={{ x: 100 }}
            className="relative flex flex-col space-y-4 bg-white p-6 sm:p-16 rounded-md border-[1px] shadow-lg sm:w-[40%] w-[90%] max-h-[90vh] overflow-y-auto z-[600] outline-none"
          >
            {children}
            <motion.button
              whileHover={{ scale: 0.95, rotate: 90 }}
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={onClose}
              aria-label="Close"
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
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type ModalReturn = [() => void, ReactElement];

export function useModal(
  contents: (props: ModalProps) => ReactNode,
): ModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => {
    setIsOpen(false);
  };
  return [
    () => setIsOpen(true),
    <Modal isOpen={isOpen} onClose={onClose}>
      {contents({ isOpen, onClose, children: null })}
    </Modal>,
  ];
}

export default Modal;
