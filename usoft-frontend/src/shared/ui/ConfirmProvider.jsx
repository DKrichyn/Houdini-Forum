import React, { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import "./ConfirmDialog.css";

const ConfirmCtx = createContext({
  confirm: async (_opts) => false,
  alert: async (_opts) => undefined,
});

export function useConfirm() {
  return useContext(ConfirmCtx);
}

export default function ConfirmProvider({ children }) {
  const [dlg, setDlg] = useState(null);

  const close = useCallback(() => setDlg(null), []);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setDlg({
        mode: "confirm",
        title: opts?.title ?? "Are you sure?",
        message: opts?.message ?? "",
        confirmText: opts?.confirmText ?? "Confirm",
        cancelText: opts?.cancelText ?? "Cancel",
        danger: !!opts?.danger,
        onResolve: resolve,
      });
    });
  }, []);

  const alert = useCallback((opts) => {
    return new Promise((resolve) => {
      setDlg({
        mode: "alert",
        title: opts?.title ?? "Notice",
        message: opts?.message ?? "",
        confirmText: opts?.confirmText ?? "OK",
        danger: !!opts?.danger,
        onResolve: resolve,
      });
    });
  }, []);

  const onConfirm = () => {
    dlg?.onResolve?.(true);
    close();
  };
  const onCancel = () => {
    if (dlg?.mode === "confirm") dlg?.onResolve?.(false);
    else dlg?.onResolve?.();
    close();
  };

  return (
    <ConfirmCtx.Provider value={{ confirm, alert }}>
      {children}
      {dlg &&
        createPortal(
          <div className="cd-backdrop" onClick={onCancel} role="presentation">
            <div
              className="cd-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cd-title"
              aria-describedby="cd-msg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="cd-title" className="cd-title">
                {dlg.title}
              </h3>
              {dlg.message && (
                <div id="cd-msg" className="cd-msg">
                  {dlg.message}
                </div>
              )}

              <div className="cd-actions">
                {dlg.mode === "confirm" && (
                  <button type="button" className="cd-btn" onClick={onCancel}>
                    {dlg.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  className={`cd-btn cd-btn--primary ${
                    dlg.danger ? "is-danger" : ""
                  }`}
                  onClick={onConfirm}
                  autoFocus
                >
                  {dlg.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmCtx.Provider>
  );
}
