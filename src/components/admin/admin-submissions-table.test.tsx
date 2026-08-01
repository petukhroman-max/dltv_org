import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminSubmissionsTable } from "@/components/admin/admin-submissions-table";
import { adminCopy } from "@/lib/admin/copy";
import { makeSubmission } from "@/test/admin-fixtures";

describe("AdminSubmissionsTable", () => {
  it("renders the read-only submission summary and details link", () => {
    const submission = makeSubmission();

    render(
      <AdminSubmissionsTable
        submissions={[
          {
            ...submission,
            organizer: { organization_name: "DLTV Events" },
          },
        ]}
      />,
    );

    expect(screen.getByText("Summer Cup")).toBeInTheDocument();
    expect(screen.getByText("DLTV Events")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Summer Cup" }),
    ).toHaveAttribute("href", `/en/admin/submissions/${submission.id}`);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<AdminSubmissionsTable submissions={[]} />);

    expect(screen.getByText(adminCopy.list.empty)).toBeInTheDocument();
  });
});
