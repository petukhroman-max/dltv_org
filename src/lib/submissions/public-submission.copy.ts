export const publicSubmissionCopy = {
  home: {
    eyebrow: "DLTV Organizer Portal",
    title: "Bring your tournament to the Deadlock community.",
    description:
      "Share your tournament details with the DLTV team. We review every submission before publication.",
    action: "Submit a tournament",
  },
  form: {
    eyebrow: "Tournament submission",
    title: "Tell us about your tournament",
    intro:
      "Complete the form below. Required fields are marked with an asterisk.",
    sections: {
      organizer: {
        title: "Organizer contact",
        description: "How our team can reach the tournament organizer.",
      },
      tournament: {
        title: "Tournament details",
        description:
          "The core information players need to understand the event.",
      },
      links: {
        title: "Links and additional information",
        description: "Add any public resources that are already available.",
      },
    },
    fields: {
      organization_name: "Organization name",
      contact_name: "Contact person",
      contact_email: "Contact email",
      discord_username: "Discord username",
      website_url: "Organization website",
      tournament_name: "Tournament name",
      description: "Description",
      region: "Region",
      language: "Language",
      start_date: "Start date",
      end_date: "End date",
      timezone: "Timezone",
      format: "Tournament format",
      prize_pool_text: "Prize pool",
      is_online: "This is an online tournament",
      max_teams: "Maximum teams",
      registration_deadline: "Registration deadline",
      registration_url: "Registration link",
      bracket_url: "Bracket link",
      discord_url: "Discord link",
      stream_url: "Stream link",
      rules_url: "Rules link",
      organizer_notes: "Additional notes",
    },
    helpers: {
      region: "Example: EU, NA, APAC, CIS",
      timezone: "Use an IANA timezone, for example Europe/Berlin",
      format: "Example: Single elimination, League, Swiss",
      prize_pool_text: "Example: $5,000 or Community prizes",
      registration_deadline:
        "ISO 8601 with timezone, e.g. 2026-08-05T18:00:00+02:00",
    },
    consent:
      "I confirm that I am authorized to submit this tournament information and allow Deadlock One / DLTV to publish, edit for clarity, translate, and distribute it on its own and partner platforms.",
    submit: "Submit tournament",
    submitting: "Submitting tournament…",
    browse: "Browse published tournaments",
  },
  success: {
    eyebrow: "Submission received",
    title: "Thank you",
    statusLabel: "Current status",
    status: "Submitted",
    referenceLabel: "Submission ID",
    review: "The DLTV team will review your tournament before publication.",
    saveReference:
      "Save this submission ID. It is the reference for your request.",
    another: "Submit another tournament",
    browse: "Browse tournaments",
    invalidReference:
      "This submission reference is invalid. No tournament data was loaded.",
  },
  errors: {
    generic:
      "We could not submit the tournament. Check the form and try again.",
    required: "Complete this required field.",
    consent: "You must confirm the publication consent.",
    invalid: {
      organization_name: "Enter a valid organization name.",
      contact_name: "Enter a valid contact person.",
      contact_email: "Enter a valid email address.",
      discord_username: "Enter a shorter Discord username.",
      website_url: "Enter a valid http or https URL.",
      tournament_name: "Enter a valid tournament name.",
      description: "Enter a shorter description.",
      region: "Enter a valid region.",
      language: "Enter a shorter language value.",
      start_date: "Enter a valid start date.",
      end_date: "End date must be on or after the start date.",
      timezone: "Enter a valid IANA timezone.",
      format: "Enter a shorter tournament format.",
      prize_pool_text: "Enter a shorter prize pool description.",
      is_online: "Choose whether the tournament is online.",
      max_teams: "Enter a positive whole number.",
      registration_deadline:
        "Enter an ISO 8601 date and time with a timezone offset.",
      registration_url: "Enter a valid http or https URL.",
      bracket_url: "Enter a valid http or https URL.",
      discord_url: "Enter a valid http or https URL.",
      stream_url: "Enter a valid http or https URL.",
      rules_url: "Enter a valid http or https URL.",
      organizer_notes: "Enter shorter additional notes.",
      consent_to_publish: "You must confirm the publication consent.",
    },
  },
} as const;

export const popularTimezones = [
  "UTC",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;
