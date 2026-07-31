import { describe, expect, it } from "vitest";

import {
  buildAdminSubmissionsQuery,
  parseAdminSubmissionFilters,
} from "@/lib/admin/filters";

describe("admin submission filters", () => {
  it("uses a 25-row page with one look-ahead row", () => {
    expect(parseAdminSubmissionFilters({ page: "3" })).toMatchObject({
      page: 3,
      limit: 26,
      offset: 50,
    });
  });

  it("drops an unknown status and invalid page", () => {
    const filters = parseAdminSubmissionFilters({
      page: "-10",
      status: "not-a-status",
    });

    expect(filters.page).toBe(1);
    expect(filters.status).toBeUndefined();
  });

  it("preserves active filters in pagination links", () => {
    const filters = parseAdminSubmissionFilters({
      status: "submitted",
      region: "EU",
      start_date_from: "2026-08-01",
    });

    expect(buildAdminSubmissionsQuery(filters, 2)).toBe(
      "/admin/submissions?page=2&status=submitted&region=EU&start_date_from=2026-08-01",
    );
  });
});
