import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isOpen) {
        switch (e.key) {
          case "Escape": {
            e.preventDefault();
            onClose();
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed left-0 top-0 z-[1000] flex h-screen w-screen items-center justify-center overflow-y-scroll backdrop-blur-lg"
        >
          <button
            className="absolute left-0 top-0 z-[500] h-full w-full"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            exit={{ x: 100 }}
            className="relative z-[600] flex h-fit w-[80%] flex-col space-y-4 rounded-md border bg-white p-16 shadow-lg sm:w-[40%]"
          >
            {children}
            <motion.button
              whileHover={{ scale: 0.95, rotate: 90 }}
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={onClose}
              className="absolute right-4 top-2 m-0 rounded-full bg-red-500 p-0 font-bold text-white"
            >
              <CloseIcon className="h-10 w-10" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type ModalReturn = [() => void, ReactElement];

export function useModal(
  contents: (props: ModalProps) => ReactElement,
): ModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => {
    setIsOpen(false);
  };
  return [
    () => {
      setIsOpen(true);
    },
    <Modal isOpen={isOpen} onClose={onClose} key="modal">
      {contents({ isOpen, onClose, children: null })}
    </Modal>,
  ];
}

export default Modal;
