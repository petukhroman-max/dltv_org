import type { Json } from "@/lib/supabase/database.types";
import type { Locale } from "@/i18n/config";
import { getImportCopy } from "@/lib/tournament-import/import-copy";

type ImportView = {
  session: {
    id: string;
    status: string;
    template_type: string;
    detected_sheets: Json;
    validation_summary: Json;
    import_summary: Json;
    fallback_timezone: string;
    timezone_confirmation_required: boolean;
    timezone_confirmed_at: string | null;
  };
  rows: Array<{
    id: string;
    entity_type: string;
    source_sheet: string;
    source_row_number: number;
    proposed_action: string;
    validation_errors: Json;
    warnings: Json;
    resolution: Json | null;
    preview_payload: unknown;
  }>;
};

type FormAction = (formData: FormData) => Promise<void>;

function jsonList(value: Json) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function TournamentImportWorkspace({
  locale,
  session,
  filter,
  uploadAction,
  resolveAction,
  confirmTimezoneAction,
  mappingAction,
  applyAction,
  cancelAction,
}: {
  locale: Locale;
  session: ImportView | null;
  filter: string;
  uploadAction: FormAction;
  resolveAction: FormAction;
  confirmTimezoneAction: FormAction;
  mappingAction: FormAction;
  applyAction: FormAction;
  cancelAction: FormAction;
}) {
  const copy = getImportCopy(locale);
  const filters = ["all", "create", "update", "conflict", "invalid", "skip"];
  const rows =
    session?.rows.filter(
      (row) => filter === "all" || row.proposed_action === filter,
    ) ?? [];
  const summary = (session?.session.validation_summary ?? {}) as Record<
    string,
    Json | undefined
  >;
  const blocking =
    Number(summary.invalid ?? 0) > 0 ||
    Boolean(session?.session.timezone_confirmation_required) ||
    session?.rows.some(
      (row) => row.proposed_action === "conflict" && !row.resolution,
    );
  const locked = session
    ? ["applying", "completed", "cancelled", "expired", "failed"].includes(
        session.session.status,
      )
    : false;
  return (
    <section className="importWorkspace" aria-labelledby="import-title">
      <header className="workspacePageHeader">
        <div>
          <p className="eyebrow">Guildlock / XLSX</p>
          <h1 id="import-title">{copy.title}</h1>
          <p className="description">{copy.description}</p>
        </div>
      </header>
      <ol className="importSteps" aria-label={copy.title}>
        {[
          copy.source,
          copy.parsing,
          copy.mapping,
          copy.validation,
          copy.preview,
          copy.conflicts,
          copy.confirmation,
          copy.report,
        ].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {!session ? (
        <div className="importSourceGrid">
          <form action={uploadAction} className="adminPanel importSourceCard">
            <input type="hidden" name="sourceType" value="xlsx" />
            <h2>{copy.xlsx}</h2>
            <input
              name="workbook"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
            />
            <button className="primaryButton" type="submit">
              {copy.upload}
            </button>
          </form>
          <form action={uploadAction} className="adminPanel importSourceCard">
            <input type="hidden" name="sourceType" value="google_sheets" />
            <h2>{copy.google}</h2>
            <input
              name="googleUrl"
              type="url"
              placeholder={copy.googlePlaceholder}
              required
            />
            <button className="primaryButton" type="submit">
              {copy.upload}
            </button>
          </form>
          <p className="adminWarning">{copy.privacy}</p>
        </div>
      ) : (
        <>
          <section className="adminPanel importSummary">
            <div>
              <strong>{copy.template}</strong>
              <span>{session.session.template_type}</span>
            </div>
            <div>
              <strong>{copy.status}</strong>
              <span>{session.session.status}</span>
            </div>
            <div>
              <strong>{copy.sheets}</strong>
              <span>
                {jsonList(session.session.detected_sheets).join(", ")}
              </span>
            </div>
            {[
              "create",
              "update",
              "conflict",
              "invalid",
              "skip",
              "warnings",
            ].map((key) => (
              <div key={key}>
                <strong>{key}</strong>
                <span>{String(summary[key] ?? 0)}</span>
              </div>
            ))}
          </section>
          {session.session.timezone_confirmation_required && !locked ? (
            <section className="adminPanel importTimezonePanel">
              <div>
                <h2>{copy.timezoneTitle}</h2>
                <p className="adminWarning">{copy.timezoneWarning}</p>
              </div>
              <form action={confirmTimezoneAction}>
                <input
                  type="hidden"
                  name="sessionId"
                  value={session.session.id}
                />
                <label>
                  {copy.timezoneLabel}
                  <input
                    name="timezone"
                    list="import-timezone-options"
                    defaultValue={session.session.fallback_timezone || "UTC"}
                    maxLength={64}
                    required
                  />
                  <datalist id="import-timezone-options">
                    {[
                      session.session.fallback_timezone,
                      "UTC",
                      "Europe/London",
                      "Europe/Berlin",
                      "Asia/Bangkok",
                      "Asia/Singapore",
                      "America/New_York",
                      "America/Los_Angeles",
                    ]
                      .filter(
                        (value, index, values) =>
                          Boolean(value) && values.indexOf(value) === index,
                      )
                      .map((value) => (
                        <option key={value} value={value} />
                      ))}
                  </datalist>
                </label>
                <label className="checkboxLabel">
                  <input
                    type="checkbox"
                    name="confirmTimezone"
                    value="true"
                    required
                  />
                  {copy.timezoneConfirmation}
                </label>
                <button className="secondaryButton" type="submit">
                  {copy.timezoneConfirm}
                </button>
              </form>
            </section>
          ) : null}
          {session.session.status === "mapping_required" ? (
            <section className="adminPanel">
              <p className="adminWarning">{copy.mappingRequired}</p>
              <form action={mappingAction} className="importMappingForm">
                <label>
                  {copy.xlsx}
                  <input name="workbook" type="file" accept=".xlsx" required />
                </label>
                <fieldset>
                  <legend>Sheets</legend>
                  <label>
                    Teams sheet
                    <input name="teamSheet" required />
                  </label>
                  <label>
                    Players sheet
                    <input name="playerSheet" />
                  </label>
                  <label>
                    Matches sheet
                    <input name="matchSheet" required />
                  </label>
                </fieldset>
                <fieldset>
                  <legend>Teams columns</legend>
                  {[
                    ["teamName", "Team name *"],
                    ["shortName", "Short name"],
                    ["region", "Region"],
                    ["seed", "Seed"],
                    ["teamGroup", "Group"],
                  ].map(([name, label]) => (
                    <label key={name}>
                      {label}
                      <input name={name} required={name === "teamName"} />
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Players columns</legend>
                  {[
                    ["displayName", "Display name *"],
                    ["playerTeam", "Team *"],
                    ["role", "Role *"],
                    ["captain", "Captain"],
                    ["country", "Country"],
                    ["platformId", "Platform ID"],
                  ].map(([name, label]) => (
                    <label key={name}>
                      {label}
                      <input
                        name={name}
                        required={[
                          "displayName",
                          "playerTeam",
                          "role",
                        ].includes(name)}
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Matches columns</legend>
                  {[
                    ["stage", "Stage *"],
                    ["matchGroup", "Group"],
                    ["round", "Round"],
                    ["matchNumber", "Match number"],
                    ["teamA", "Team A *"],
                    ["teamB", "Team B *"],
                    ["scheduledDateTime", "Date/time"],
                    ["timezone", "Timezone"],
                    ["bestOf", "BO"],
                    ["scoreA", "Score A"],
                    ["scoreB", "Score B"],
                    ["status", "Status"],
                    ["deadlockMatchId", "Deadlock Match ID"],
                    ["stream", "Stream"],
                    ["vod", "VOD"],
                  ].map(([name, label]) => (
                    <label key={name}>
                      {label}
                      <input
                        name={name}
                        required={["stage", "teamA", "teamB"].includes(name)}
                      />
                    </label>
                  ))}
                </fieldset>
                <button className="primaryButton" type="submit">
                  {copy.mapping}
                </button>
              </form>
            </section>
          ) : null}
          {session.session.status === "completed" ? (
            <section className="adminPanel">
              <h2>{copy.completed}</h2>
              <pre className="importJson">
                {JSON.stringify(session.session.import_summary, null, 2)}
              </pre>
            </section>
          ) : (
            <>
              <nav className="importFilters" aria-label={copy.preview}>
                {filters.map((item) => (
                  <a
                    key={item}
                    aria-current={filter === item ? "page" : undefined}
                    href={`?session=${session.session.id}&filter=${item}`}
                  >
                    {copy[item as keyof typeof copy] ?? item}
                  </a>
                ))}
              </nav>
              <div className="importRows">
                {rows.map((row) => (
                  <article
                    className={`importRow importRow-${row.proposed_action}`}
                    key={row.id}
                  >
                    <header>
                      <strong>{row.entity_type}</strong>
                      <span>
                        {copy.row}: {row.source_sheet}:{row.source_row_number}
                      </span>
                      <span className="statusBadge">{row.proposed_action}</span>
                    </header>
                    <pre className="importJson">
                      {JSON.stringify(row.preview_payload, null, 2)}
                    </pre>
                    {jsonList(row.validation_errors).length ? (
                      <p className="fieldError">
                        {copy.errors}:{" "}
                        {jsonList(row.validation_errors).join(", ")}
                      </p>
                    ) : null}
                    {jsonList(row.warnings).length ? (
                      <p className="adminWarning">
                        {copy.warnings}:{" "}
                        {jsonList(row.warnings)
                          .map((warning) =>
                            warning ===
                            "timezone_fallback_confirmation_required"
                              ? copy.timezoneWarning
                              : warning,
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                    {row.proposed_action === "conflict" && !locked ? (
                      <form
                        action={resolveAction}
                        className="importResolutionForm"
                      >
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.session.id}
                        />
                        <input type="hidden" name="rowId" value={row.id} />
                        <label>
                          {copy.resolve}
                          <select name="decision" defaultValue="keep_existing">
                            <option value="keep_existing">{copy.keep}</option>
                            <option value="use_spreadsheet">
                              {copy.useSheet}
                            </option>
                            <option value="skip">{copy.skipRow}</option>
                            <option value="link_existing">{copy.link}</option>
                            <option value="create_new">{copy.createNew}</option>
                          </select>
                        </label>
                        <label>
                          {copy.existingId}
                          <input name="existingEntityId" />
                        </label>
                        <label className="checkboxLabel">
                          <input
                            type="checkbox"
                            name="confirmedCompletedResultOverwrite"
                            value="true"
                          />
                          {copy.highRisk}
                        </label>
                        <button className="secondaryButton" type="submit">
                          {copy.resolve}
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
              {blocking ? (
                <p className="fieldError importBlocking">{copy.blocked}</p>
              ) : null}
              {!locked ? (
                <div className="importConfirmation">
                  <form action={applyAction}>
                    <input
                      type="hidden"
                      name="sessionId"
                      value={session.session.id}
                    />
                    <button
                      className="primaryButton"
                      type="submit"
                      disabled={blocking || session.session.status !== "ready"}
                    >
                      {copy.confirm}
                    </button>
                  </form>
                  <form action={cancelAction}>
                    <input
                      type="hidden"
                      name="sessionId"
                      value={session.session.id}
                    />
                    <button className="dangerButton" type="submit">
                      {copy.cancel}
                    </button>
                  </form>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}
