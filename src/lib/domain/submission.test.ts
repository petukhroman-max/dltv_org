import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  assertSubmissionStatusTransition,
  canTransitionSubmissionStatus,
  listFiltersSchema,
  organizerInputSchema,
  submissionStatuses,
  tournamentSubmissionInputSchema,
  type SubmissionStatus,
} from "@/lib/domain/submission";

const validOrganizer = {
  organization_name: "  DLTV Events  ",
  contact_name: "  Tournament Team  ",
  contact_email: "  EVENTS@EXAMPLE.COM ",
  discord_username: "",
  website_url: "",
};

const validSubmission = {
  tournament_name: " Summer Cup ",
  description: "",
  region: " Europe ",
  language: "",
  start_date: "2026-08-01",
  end_date: "2026-08-03",
  timezone: "Europe/Berlin",
  format: "",
  prize_pool_text: "",
  registration_url: "https://example.com/register",
  bracket_url: "",
  discord_url: "",
  stream_url: "",
  rules_url: "",
  is_online: true,
  max_teams: 16,
  registration_deadline: "2026-07-25T18:00:00+02:00",
  organizer_notes: "",
};

const tournamentUrlFields = [
  "registration_url",
  "bracket_url",
  "discord_url",
  "stream_url",
  "rules_url",
] as const;

describe("organizerInputSchema", () => {
  it("accepts and normalizes a valid organizer", () => {
    expect(organizerInputSchema.parse(validOrganizer)).toEqual({
      organization_name: "DLTV Events",
      contact_name: "Tournament Team",
      contact_email: "events@example.com",
      discord_username: null,
      website_url: null,
    });
  });

  it("normalizes an empty optional URL to null", () => {
    expect(
      organizerInputSchema.parse({
        ...validOrganizer,
        website_url: "  ",
      }).website_url,
    ).toBeNull();
  });

  it.each(["http://[", "abc"])(
    "returns a validation error for malformed URL %s",
    (websiteUrl) => {
      expect(
        organizerInputSchema.safeParse({
          ...validOrganizer,
          website_url: websiteUrl,
        }).success,
      ).toBe(false);
    },
  );

  it.each(["javascript:alert(1)", "data:text/plain,test", "ftp://example.com"])(
    "rejects the non-http protocol in %s",
    (websiteUrl) => {
      expect(
        organizerInputSchema.safeParse({
          ...validOrganizer,
          website_url: websiteUrl,
        }).success,
      ).toBe(false);
    },
  );

  it("accepts a valid https URL", () => {
    expect(
      organizerInputSchema.parse({
        ...validOrganizer,
        website_url: "https://example.com/events",
      }).website_url,
    ).toBe("https://example.com/events");
  });

  it("never exposes a raw TypeError for an invalid URL", () => {
    try {
      organizerInputSchema.parse({
        ...validOrganizer,
        website_url: "http://[",
      });
      throw new Error("Expected URL validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      expect(error).not.toBeInstanceOf(TypeError);
    }
  });
});

describe("tournamentSubmissionInputSchema", () => {
  it("accepts and normalizes a valid submission", () => {
    expect(
      tournamentSubmissionInputSchema.parse(validSubmission),
    ).toMatchObject({
      tournament_name: "Summer Cup",
      region: "Europe",
      description: null,
      language: null,
      bracket_url: null,
    });
  });

  it("rejects an end date before the start date", () => {
    expect(() =>
      tournamentSubmissionInputSchema.parse({
        ...validSubmission,
        end_date: "2026-07-31",
      }),
    ).toThrow();
  });

  it.each([0, -1])("rejects max_teams=%s", (maxTeams) => {
    expect(() =>
      tournamentSubmissionInputSchema.parse({
        ...validSubmission,
        max_teams: maxTeams,
      }),
    ).toThrow();
  });

  it("rejects an invalid timezone", () => {
    expect(() =>
      tournamentSubmissionInputSchema.parse({
        ...validSubmission,
        timezone: "Mars/Olympus_Mons",
      }),
    ).toThrow();
  });

  it("accepts a valid IANA timezone", () => {
    expect(
      tournamentSubmissionInputSchema.parse(validSubmission).timezone,
    ).toBe("Europe/Berlin");
  });

  it("normalizes empty optional strings to null", () => {
    const parsed = tournamentSubmissionInputSchema.parse(validSubmission);
    expect(parsed.description).toBeNull();
    expect(parsed.rules_url).toBeNull();
    expect(parsed.organizer_notes).toBeNull();
  });

  it.each(tournamentUrlFields)("normalizes an empty %s to null", (field) => {
    const parsed = tournamentSubmissionInputSchema.parse({
      ...validSubmission,
      [field]: " ",
    });
    expect(parsed[field]).toBeNull();
  });

  it.each(tournamentUrlFields)(
    "returns a Zod validation error for malformed %s",
    (field) => {
      const result = tournamentSubmissionInputSchema.safeParse({
        ...validSubmission,
        [field]: "http://[",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    },
  );

  it.each(tournamentUrlFields)("accepts a valid https %s", (field) => {
    const url = `https://example.com/${field}`;
    const parsed = tournamentSubmissionInputSchema.parse({
      ...validSubmission,
      [field]: url,
    });
    expect(parsed[field]).toBe(url);
  });

  it("rejects registration deadlines without an offset", () => {
    expect(() =>
      tournamentSubmissionInputSchema.parse({
        ...validSubmission,
        registration_deadline: "2026-07-25T18:00:00",
      }),
    ).toThrow();
  });
});

describe("submission status transitions", () => {
  const allowed: [SubmissionStatus, SubmissionStatus][] = [
    ["draft", "submitted"],
    ["submitted", "needs_changes"],
    ["submitted", "approved"],
    ["submitted", "rejected"],
    ["needs_changes", "submitted"],
    ["approved", "published"],
    ["approved", "needs_changes"],
    ["published", "needs_changes"],
  ];

  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransitionSubmissionStatus(from, to)).toBe(true);
    expect(() => assertSubmissionStatusTransition(from, to)).not.toThrow();
  });

  it("rejects all transitions not explicitly allowed", () => {
    const allowedKeys = new Set(allowed.map(([from, to]) => `${from}:${to}`));

    for (const from of submissionStatuses) {
      for (const to of submissionStatuses) {
        if (!allowedKeys.has(`${from}:${to}`)) {
          expect(canTransitionSubmissionStatus(from, to)).toBe(false);
          expect(() => assertSubmissionStatusTransition(from, to)).toThrow(
            "Submission status transition is not allowed",
          );
        }
      }
    }
  });
});

describe("listFiltersSchema", () => {
  it("uses the default limit and offset", () => {
    expect(listFiltersSchema.parse({})).toMatchObject({
      limit: 50,
      offset: 0,
    });
  });

  it("rejects limits above 100", () => {
    expect(() => listFiltersSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects a negative offset", () => {
    expect(() => listFiltersSchema.parse({ offset: -1 })).toThrow();
  });
});
