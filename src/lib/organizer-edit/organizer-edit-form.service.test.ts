import { describe, expect, it, vi } from "vitest";

import { processOrganizerResubmission } from "@/lib/organizer-edit/organizer-edit-form.service";

function validFormData() {
  const data = new FormData();
  const values: Record<string, string> = {
    tournament_name: "DLTV Cup",
    description: "Updated",
    region: "EU",
    language: "English",
    start_date: "2026-08-10",
    end_date: "2026-08-12",
    timezone: "Europe/Berlin",
    format: "Single elimination",
    prize_pool_text: "$1,000",
    registration_url: "https://example.com/register",
    bracket_url: "",
    discord_url: "https://discord.gg/example",
    stream_url: "https://example.com/stream",
    rules_url: "https://example.com/rules",
    is_online: "on",
    max_teams: "16",
    registration_deadline: "2026-08-09T18:00:00+02:00",
    organizer_notes: "Ready",
    confirmed: "on",
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("processOrganizerResubmission", () => {
  it("passes only editable validated fields to the atomic service", async () => {
    const resubmit = vi.fn().mockResolvedValue({});
    const data = validFormData();
    data.set("status", "published");
    data.set("reviewer_notes", "overwritten");

    const result = await processOrganizerResubmission(
      "A".repeat(43),
      data,
      resubmit,
    );

    expect(result).toEqual({ status: "success" });
    expect(resubmit).toHaveBeenCalledOnce();
    const payload = resubmit.mock.calls[0][1];
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("reviewer_notes");
    expect(payload).not.toHaveProperty("confirmed");
  });

  it("requires explicit confirmation and preserves entered values", async () => {
    const data = validFormData();
    data.delete("confirmed");
    const resubmit = vi.fn();

    const result = await processOrganizerResubmission(
      "A".repeat(43),
      data,
      resubmit,
    );

    expect(result.status).toBe("error");
    expect(result).toMatchObject({
      fieldErrors: { confirmed: expect.any(String) },
      values: { tournament_name: "DLTV Cup" },
    });
    expect(resubmit).not.toHaveBeenCalled();
  });

  it("rejects malformed URLs as validation errors", async () => {
    const data = validFormData();
    data.set("rules_url", "javascript:alert(1)");
    const result = await processOrganizerResubmission(
      "A".repeat(43),
      data,
      vi.fn(),
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { rules_url: expect.any(String) },
    });
  });

  it("returns one generic error when the token service rejects", async () => {
    const result = await processOrganizerResubmission(
      "A".repeat(43),
      validFormData(),
      vi.fn().mockRejectedValue(new Error("database detail")),
    );
    expect(result).toMatchObject({
      status: "error",
      formError: "This edit link is invalid or no longer available.",
    });
  });

  it("enforces the 32 KiB payload limit", async () => {
    const data = validFormData();
    data.set("description", "x".repeat(33_000));
    const resubmit = vi.fn();
    const result = await processOrganizerResubmission(
      "A".repeat(43),
      data,
      resubmit,
    );
    expect(result.status).toBe("error");
    expect(resubmit).not.toHaveBeenCalled();
  });
});
