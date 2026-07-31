import { describe, expect, it, vi } from "vitest";

import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";
import { processPublicTournamentSubmission } from "@/lib/submissions/public-submission.service";
import type { AtomicPublicSubmissionService } from "@/lib/submissions/public-submission.types";

const now = 1_800_000_000_000;
const submissionId = "08bd117e-7188-49a4-a49b-5122c0a3ea57";

function makeFormData(
  overrides: Record<string, string | undefined> = {},
): FormData {
  const values: Record<string, string> = {
    rendered_at: String(now - 4_000),
    organization_name: "  DLTV Events  ",
    contact_name: "  Tournament Team  ",
    contact_email: "  EVENTS@EXAMPLE.COM ",
    discord_username: "dltv_events",
    website_url: "https://example.com",
    tournament_name: "  Summer Cup  ",
    description: "A community tournament.",
    region: "EU",
    language: "English",
    start_date: "2026-08-10",
    end_date: "2026-08-12",
    timezone: "Europe/Berlin",
    format: "Swiss",
    prize_pool_text: "$5,000",
    is_online: "on",
    max_teams: "16",
    registration_deadline: "2026-08-05T18:00:00+02:00",
    registration_url: "https://example.com/register",
    bracket_url: "https://example.com/bracket",
    discord_url: "https://discord.gg/example",
    stream_url: "https://twitch.tv/example",
    rules_url: "https://example.com/rules",
    organizer_notes: "Contact us on Discord.",
    consent_to_publish: "on",
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete values[key];
    } else {
      values[key] = value;
    }
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function successfulService() {
  return vi.fn<AtomicPublicSubmissionService>().mockResolvedValue({
    submission: { id: submissionId, status: "submitted" },
  });
}

describe("processPublicTournamentSubmission", () => {
  it("accepts a valid full payload and calls the atomic service once", async () => {
    const service = successfulService();

    const result = await processPublicTournamentSubmission(
      makeFormData(),
      service,
      now,
    );

    expect(result).toMatchObject({
      status: "success",
      submissionId,
    });
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith(
      expect.objectContaining({
        organizer: expect.objectContaining({
          organization_name: "DLTV Events",
          contact_email: "events@example.com",
        }),
        submission: expect.objectContaining({
          tournament_name: "Summer Cup",
        }),
        consent: {
          consent_to_publish: true,
          consent_version: "v1",
        },
      }),
    );
  });

  it("accepts a valid minimal payload and normalizes optional fields", async () => {
    const service = successfulService();
    const formData = makeFormData({
      discord_username: undefined,
      website_url: undefined,
      description: undefined,
      language: undefined,
      format: undefined,
      prize_pool_text: undefined,
      is_online: undefined,
      max_teams: undefined,
      registration_deadline: undefined,
      registration_url: undefined,
      bracket_url: undefined,
      discord_url: undefined,
      stream_url: undefined,
      rules_url: undefined,
      organizer_notes: undefined,
    });

    const result = await processPublicTournamentSubmission(
      formData,
      service,
      now,
    );

    expect(result.status).toBe("success");
    expect(service).toHaveBeenCalledWith(
      expect.objectContaining({
        organizer: expect.objectContaining({
          discord_username: null,
          website_url: null,
        }),
        submission: expect.objectContaining({
          description: null,
          is_online: false,
          max_teams: null,
          registration_deadline: null,
        }),
      }),
    );
  });

  it.each([
    ["contact_email", "invalid-email", "contact_email"],
    ["website_url", "javascript:alert(1)", "website_url"],
    ["end_date", "2026-08-01", "end_date"],
    ["timezone", "Mars/Olympus_Mons", "timezone"],
    ["registration_deadline", "2026-08-05T18:00:00", "registration_deadline"],
  ])(
    "rejects invalid %s without calling the service",
    async (field, value, expectedError) => {
      const service = successfulService();

      const result = await processPublicTournamentSubmission(
        makeFormData({ [field]: value }),
        service,
        now,
      );

      expect(result.status).toBe("error");
      expect(result.fieldErrors).toHaveProperty(expectedError);
      expect(service).not.toHaveBeenCalled();
    },
  );

  it("rejects missing consent", async () => {
    const service = successfulService();

    const result = await processPublicTournamentSubmission(
      makeFormData({ consent_to_publish: undefined }),
      service,
      now,
    );

    expect(result.fieldErrors.consent_to_publish).toBe(
      publicSubmissionCopy.errors.consent,
    );
    expect(service).not.toHaveBeenCalled();
  });

  it("rejects a populated honeypot without disclosing why", async () => {
    const service = successfulService();
    const formData = makeFormData();
    formData.set("company_fax", "automated");

    const result = await processPublicTournamentSubmission(
      formData,
      service,
      now,
    );

    expect(result).toMatchObject({
      status: "error",
      formError: publicSubmissionCopy.errors.generic,
      fieldErrors: {},
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("rejects a submission completed too quickly", async () => {
    const service = successfulService();

    const result = await processPublicTournamentSubmission(
      makeFormData({ rendered_at: String(now - 1_000) }),
      service,
      now,
    );

    expect(result.formError).toBe(publicSubmissionCopy.errors.generic);
    expect(service).not.toHaveBeenCalled();
  });

  it("rejects an oversized payload before validation", async () => {
    const service = successfulService();
    const formData = makeFormData({
      description: "x".repeat(33_000),
    });

    const result = await processPublicTournamentSubmission(
      formData,
      service,
      now,
    );

    expect(result.formError).toBe(publicSubmissionCopy.errors.generic);
    expect(result.values).toEqual({});
    expect(service).not.toHaveBeenCalled();
  });

  it("returns a generic error without leaking service-role details", async () => {
    const service = vi
      .fn<AtomicPublicSubmissionService>()
      .mockRejectedValue(
        new Error("SUPABASE_SERVICE_ROLE_KEY caused postgres error 23514"),
      );

    const result = await processPublicTournamentSubmission(
      makeFormData(),
      service,
      now,
    );

    expect(result.formError).toBe(publicSubmissionCopy.errors.generic);
    expect(JSON.stringify(result)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(JSON.stringify(result)).not.toContain("23514");
  });

  it("rejects an unexpected non-submitted database result", async () => {
    const service = vi.fn<AtomicPublicSubmissionService>().mockResolvedValue({
      submission: { id: submissionId, status: "draft" },
    });

    const result = await processPublicTournamentSubmission(
      makeFormData(),
      service,
      now,
    );

    expect(result.formError).toBe(publicSubmissionCopy.errors.generic);
  });

  it("does not accept user-controlled workflow or audit fields", async () => {
    const service = successfulService();
    const formData = makeFormData();
    formData.set("status", "published");
    formData.set("reviewed_by", submissionId);
    formData.set("actor_type", "admin");
    formData.set("metadata", '{"trusted":true}');

    await processPublicTournamentSubmission(formData, service, now);

    const input = service.mock.calls[0][0];
    expect(input.submission).not.toHaveProperty("status");
    expect(input.submission).not.toHaveProperty("reviewed_by");
    expect(input).not.toHaveProperty("actor_type");
    expect(input).not.toHaveProperty("metadata");
  });
});
