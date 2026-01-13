import React, { useEffect, useRef } from "react";
import "./Modal.css";

export default function Modal({ open, onClose, title, children, width = 520 }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modalRoot"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      <div className="modalBackdrop" onClick={onClose} />
      <div
        className="modalCard"
        style={{ maxWidth: typeof width === "number" ? `${width}px` : width }}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="modalClose" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
