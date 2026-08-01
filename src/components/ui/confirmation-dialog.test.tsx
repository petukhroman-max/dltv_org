import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

describe("ConfirmationDialog", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
  });

  it("provides named destructive confirmation and visible cancel", () => {
    render(
      <ConfirmationDialog
        trigger="Delete stage"
        title="Delete “Qualifier”?"
        description="This cannot be undone."
        cancelLabel="Cancel"
      >
        <button type="button">Confirm delete</button>
      </ConfirmationDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete stage" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(
      screen.getByRole("heading", { name: "Delete “Qualifier”?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});
