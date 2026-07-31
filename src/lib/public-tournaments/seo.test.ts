import { describe, expect, it } from "vitest";

import {
  sportsEventJsonLd,
  tournamentMetadata,
} from "@/lib/public-tournaments/seo";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

describe("public tournament SEO", () => {
  it("generates canonical and Open Graph metadata", () => {
    const metadata = tournamentMetadata(publishedTournamentFixture);
    expect(metadata.title).toContain("DLTV Cup");
    expect(metadata.alternates?.canonical).toContain("/tournaments/dltv-cup");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: expect.stringContaining("DLTV Cup"),
    });
  });

  it("uses only confirmed SportsEvent data", () => {
    const jsonLd = sportsEventJsonLd(publishedTournamentFixture);
    expect(jsonLd).toMatchObject({
      "@type": "SportsEvent",
      name: "DLTV Cup",
      organizer: { "@type": "Organization", name: "Deadlock One" },
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    });
    expect(jsonLd).not.toHaveProperty("venue");
    expect(jsonLd).not.toHaveProperty("performer");
    expect(jsonLd).not.toHaveProperty("offers");
    expect(jsonLd).not.toHaveProperty("eventStatus");
  });
});
