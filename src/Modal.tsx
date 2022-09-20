import ReactDom from "react-dom";
import { useState } from "react";

import "./css/modal.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: any;
  children: any;
}

// TODO: add more functionality/options or use a library - this is really jank lol
function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  const portalDiv = document.getElementById("portal")!;

  return ReactDom.createPortal(
    <>
      <div onClick={onClose} className="modal-overlay" />
      <div className="modal">
        {children}
        <button style={{ margin: "auto" }} onClick={onClose}>
          Close
        </button>
      </div>
    </>,
    portalDiv,
  );
}

export type ModalReturn = [() => void, JSX.Element];

export function useModal(
  contents: (props: ModalProps) => JSX.Element,
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
