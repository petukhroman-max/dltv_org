"use client";

import { useId, useRef, type ReactNode } from "react";

export function ConfirmationDialog({
  trigger,
  title,
  description,
  cancelLabel,
  children,
}: {
  trigger: string;
  title: string;
  description: string;
  cancelLabel: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        className="dangerButton"
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        className="confirmationDialog"
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="dialogContent">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
          <div className="dialogActions">
            <button
              className="secondaryButton"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              {cancelLabel}
            </button>
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
