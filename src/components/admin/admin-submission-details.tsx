import { StatusBadge } from "@/components/admin/status-badge";
import { adminCopy } from "@/lib/admin/copy";
import {
  formatAdminDate,
  formatAdminDateTime,
  getSafeExternalUrl,
  sanitizeEventMetadata,
} from "@/lib/admin/presentation";
import type { TableRow } from "@/lib/supabase/database.types";

export type AdminSubmissionDetailsData = {
  submission: TableRow<"tournament_submissions">;
  organizer: TableRow<"organizers">;
  events: TableRow<"submission_events">[];
};

function Value({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="adminDefinition">
      <dt>{label}</dt>
      <dd>{children ?? adminCopy.details.notAvailable}</dd>
    </div>
  );
}

function ExternalLink({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const safeUrl = getSafeExternalUrl(value);
  return (
    <Value label={label}>
      {safeUrl ? (
        <a href={safeUrl} target="_blank" rel="noopener noreferrer">
          {safeUrl}
        </a>
      ) : (
        adminCopy.details.notAvailable
      )}
    </Value>
  );
}

export function AdminSubmissionDetails({
  details,
}: {
  details: AdminSubmissionDetailsData;
}) {
  const { submission, organizer, events } = details;

  return (
    <div className="adminDetails">
      <section className="adminPanel" aria-labelledby="tournament-heading">
        <div className="adminPanelHeading">
          <h2 id="tournament-heading">{adminCopy.details.tournament}</h2>
          <StatusBadge status={submission.status} />
        </div>
        <dl className="adminDefinitionGrid">
          <Value label="Name">{submission.tournament_name}</Value>
          <Value label="Region">{submission.region}</Value>
          <Value label="Language">{submission.language}</Value>
          <Value label="Description">{submission.description}</Value>
          <Value label="Start date">
            {formatAdminDate(submission.start_date)}
          </Value>
          <Value label="End date">{formatAdminDate(submission.end_date)}</Value>
          <Value label="Timezone">{submission.timezone}</Value>
          <Value label="Format">{submission.format}</Value>
          <Value label="Prize pool">{submission.prize_pool_text}</Value>
          <Value label="Location">
            {submission.is_online
              ? adminCopy.details.online
              : adminCopy.details.offline}
          </Value>
          <Value label="Maximum teams">{submission.max_teams}</Value>
          <Value label="Registration deadline">
            {formatAdminDateTime(submission.registration_deadline)}
          </Value>
          <Value label="Organizer notes">{submission.organizer_notes}</Value>
          <Value label="Reviewer notes">{submission.reviewer_notes}</Value>
          <Value label="Submitted">
            {formatAdminDateTime(submission.submitted_at)}
          </Value>
          <Value label="Reviewed">
            {formatAdminDateTime(submission.reviewed_at)}
          </Value>
          <Value label="Published">
            {formatAdminDateTime(submission.published_at)}
          </Value>
          <Value label="Created">
            {formatAdminDateTime(submission.created_at)}
          </Value>
          <Value label="Last updated">
            {formatAdminDateTime(submission.updated_at)}
          </Value>
        </dl>
      </section>

      <section className="adminPanel" aria-labelledby="organizer-heading">
        <h2 id="organizer-heading">{adminCopy.details.organizer}</h2>
        <dl className="adminDefinitionGrid">
          <Value label="Organization">{organizer.organization_name}</Value>
          <Value label="Contact name">{organizer.contact_name}</Value>
          <Value label="Contact email">
            <a href={`mailto:${organizer.contact_email}`}>
              {organizer.contact_email}
            </a>
          </Value>
          <Value label="Discord username">{organizer.discord_username}</Value>
          <ExternalLink label="Website" value={organizer.website_url} />
        </dl>
      </section>

      <section className="adminPanel" aria-labelledby="links-heading">
        <h2 id="links-heading">{adminCopy.details.links}</h2>
        <dl className="adminDefinitionGrid">
          <ExternalLink
            label="Registration"
            value={submission.registration_url}
          />
          <ExternalLink label="Bracket" value={submission.bracket_url} />
          <ExternalLink label="Discord" value={submission.discord_url} />
          <ExternalLink label="Stream" value={submission.stream_url} />
          <ExternalLink label="Rules" value={submission.rules_url} />
        </dl>
      </section>

      <section className="adminPanel" aria-labelledby="audit-heading">
        <h2 id="audit-heading">{adminCopy.details.audit}</h2>
        {events.length === 0 ? (
          <p className="adminEmpty">{adminCopy.details.noEvents}</p>
        ) : (
          <ol className="adminTimeline">
            {events.map((event) => {
              const metadata = sanitizeEventMetadata(event.metadata);
              const consentMetadata =
                metadata &&
                !Array.isArray(metadata) &&
                typeof metadata === "object"
                  ? metadata
                  : null;
              return (
                <li key={event.id}>
                  <div className="adminEventHeading">
                    <strong>{event.event_type}</strong>
                    <time dateTime={event.created_at}>
                      {formatAdminDateTime(event.created_at)}
                    </time>
                  </div>
                  <p>
                    {event.from_status ?? "none"} → {event.to_status ?? "none"}{" "}
                    · {event.actor_type}
                  </p>
                  {consentMetadata &&
                  "consent_to_publish" in consentMetadata ? (
                    <dl className="adminEventMetadata">
                      <Value label={adminCopy.details.consentToPublish}>
                        {consentMetadata.consent_to_publish === true
                          ? "Yes"
                          : "No"}
                      </Value>
                      {"consent_version" in consentMetadata ? (
                        <Value label={adminCopy.details.consentVersion}>
                          {String(consentMetadata.consent_version)}
                        </Value>
                      ) : null}
                    </dl>
                  ) : null}
                  {metadata &&
                  typeof metadata === "object" &&
                  Object.keys(metadata).length > 0 ? (
                    <pre className="adminMetadata">
                      <code>{JSON.stringify(metadata, null, 2)}</code>
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
