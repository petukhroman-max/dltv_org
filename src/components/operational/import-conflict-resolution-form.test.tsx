import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImportConflictResolutionForm } from "./import-conflict-resolution-form";

const copy = {
  resolve: "Resolve conflict",
  resolving: "Resolving…",
  keep: "Keep existing",
  useSheet: "Use spreadsheet value",
  skipRow: "Skip row",
  link: "Link to existing entity",
  createNew: "Create new entity",
  existingEntitySearch: "Existing entity",
  existingEntityPlaceholder: "Search by name or match label",
  highRisk: "Confirm completed result overwrite",
};

function renderForm(highRiskCompletedResult = false, canKeepExisting = true) {
  return render(
    <ImportConflictResolutionForm
      action={vi.fn(async () => undefined)}
      sessionId="00000000-0000-4000-8000-000000000001"
      sessionVersion="2026-08-02T10:00:00.000Z"
      rowId="00000000-0000-4000-8000-000000000002"
      candidates={[
        {
          id: "00000000-0000-4000-8000-000000000003",
          label: "Groups · #1",
        },
      ]}
      canKeepExisting={canKeepExisting}
      highRiskCompletedResult={highRiskCompletedResult}
      copy={copy}
    />,
  );
}

describe("ImportConflictResolutionForm", () => {
  it("does not require or expose a UUID for Keep existing", () => {
    const { container } = renderForm();
    expect(screen.getByDisplayValue("Keep existing")).toBeInTheDocument();
    expect(screen.queryByLabelText("Existing entity")).not.toBeInTheDocument();
    expect(container.querySelector('[name="existingEntityId"]')).toBeNull();
    expect(container.querySelector('[name="sessionVersion"]')).toHaveValue(
      "2026-08-02T10:00:00.000Z",
    );
  });

  it("shows a searchable label selector only for Link to existing", () => {
    const { container } = renderForm();
    fireEvent.change(screen.getByLabelText("Resolve conflict"), {
      target: { value: "link_existing" },
    });
    const search = screen.getByLabelText("Existing entity");
    expect(search).toHaveAttribute("type", "search");
    fireEvent.change(search, { target: { value: "Groups · #1" } });
    expect(container.querySelector('[name="existingEntityId"]')).toHaveValue(
      "00000000-0000-4000-8000-000000000003",
    );
    expect(screen.queryByText(/00000000-0000/)).not.toBeInTheDocument();
  });

  it("does not offer Keep existing when no entity was matched automatically", () => {
    renderForm(false, false);
    expect(screen.queryByRole("option", { name: "Keep existing" })).toBeNull();
    expect(screen.getByDisplayValue("Skip row")).toBeInTheDocument();
  });

  it("shows high-risk confirmation only for a completed-result spreadsheet overwrite", () => {
    renderForm(true);
    expect(
      screen.queryByLabelText("Confirm completed result overwrite"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Resolve conflict"), {
      target: { value: "use_spreadsheet" },
    });
    expect(
      screen.getByLabelText("Confirm completed result overwrite"),
    ).toBeInTheDocument();
  });
});
