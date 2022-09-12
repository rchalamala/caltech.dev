import ReactDom from "react-dom";

import "./css/modal.css";

interface ModalProps {
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
    portalDiv
  );
}

export default Modal;
