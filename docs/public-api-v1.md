# DLTV Public API v1

The DLTV Public API provides authenticated, read-only access to the same published tournament projection used by the public website. It never exposes submission, stage, team, player, or match database UUIDs; private contacts, real names, platform account IDs, workspace tokens, import data, and audit data are outside the API contract.

## Access and attribution

Apply at `/en/api-access` or `/ru/api-access`. Access is reviewed manually. Every downstream presentation must identify the source as **Data provided by DLTV** (or a localized equivalent) and link to <https://deadlock.one> where links are supported. Terms version: `2026-08-v1`.

Send credentials only in the header:

```http
Authorization: Bearer dltv_live_<secret>
```

Keys in URLs, query parameters, cookies, or request bodies are not supported. Store the key as a secret. A raw key is displayed once; DLTV stores only an identifying prefix and an HMAC-SHA256 digest protected by the server-side `API_KEY_PEPPER`.

## Endpoints

- `GET /api/v1` — public health/version response.
- `GET /api/v1/tournaments`
- `GET /api/v1/tournaments/{slug}`
- `GET /api/v1/tournaments/{slug}/stages`
- `GET /api/v1/tournaments/{slug}/teams`
- `GET /api/v1/tournaments/{slug}/matches`
- `GET /api/v1/tournaments/{slug}/bracket`
- `GET /api/v1/tournaments/{slug}/standings`

Tournament filters: `status`, `date_from`, `date_to`, `region`, `limit` (maximum 100), and `cursor`. Match filters: `status`, `stage`, `team`, `date_from`, `date_to`, `limit` (maximum 100), and `cursor`. Cursors are opaque and must be passed back unchanged.

See the published OpenAPI document at `/openapi-v1.json` for schemas and examples. Human-readable EN/RU documentation is available at `/en/api-docs` and `/ru/api-docs`.

## Responses and errors

Successful responses use `{ data, meta }`. `meta` and the `X-DLTV-*` response headers repeat the attribution requirement and current terms version. Every response has `X-Request-ID`; include it when reporting a problem.

Errors use a stable safe shape:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request parameters are invalid.",
    "request_id": "..."
  }
}
```

`401` means the key is missing, invalid, or expired. `403` means the key/client is suspended or revoked, or the endpoint is outside its allowlist. `429` means a minute or daily rate limit was exceeded. Rate-limit limits, remaining counts, and reset time are returned in `X-RateLimit-*` headers after authentication.

Stable error codes include `API_KEY_REQUIRED`, `INVALID_API_KEY`, `API_KEY_EXPIRED`, `API_KEY_REVOKED`, `API_CLIENT_SUSPENDED`, `ENDPOINT_NOT_ALLOWED`, `RATE_LIMIT_EXCEEDED`, `INVALID_CURSOR`, `INVALID_FILTER`, `TOURNAMENT_NOT_FOUND`, `RESOURCE_NOT_FOUND`, and `INTERNAL_API_ERROR`. Errors never include stack traces, SQL/Supabase details, or internal identifiers.

## Operations and retention

Usage logs contain client/key IDs, request ID, endpoint, method, response status, duration, response size, bounded user-agent/origin values, and timestamp. They never contain raw keys, Authorization headers, response bodies, query strings, or full IP addresses. The intended retention is 90 days; deletion is performed by an externally scheduled maintenance job.

The migration is not applied by the application. Deployers must set a random server-only `API_KEY_PEPPER` of at least 32 characters before issuing keys, dry-run the new migration against a local Supabase instance, and then apply it through the normal reviewed database deployment process.

## CORS and caching

Bearer authentication is the authorization boundary. Browser preflight allows only an origin configured on an active client, `GET`/`OPTIONS`, and `Authorization`/`Content-Type`; it never uses cookies, credentials, or a wildcard origin. Server-to-server requests do not need an `Origin` header.

The MVP deliberately returns `private, no-store` so an authenticated response cannot enter a shared cache keyed by a credential. The underlying published projection keeps its existing organizer/import revalidation behavior. A future performance pass may add a short server-side public-data cache whose key contains only endpoint/filter/public identifiers and never a raw API key.

List endpoints use signed, endpoint-scoped opaque cursors, deterministic sorting, and a maximum page size of 100. Bracket and standings return the complete public stage structures for a tournament; consumers should avoid unnecessary polling. Tournament-list queries have an eight-second database timeout. The API projection uses fixed bulk reads for stages, teams, rosters, and matches rather than per-record queries.

## Client and key lifecycle

Approval atomically changes a pending request to approved and creates one client; duplicate approval safely returns the existing client. Creating a key is a separate explicit action. Rotation atomically creates a new key and irreversibly revokes the old key. Suspension is reversible where the admin UI permits it; revocation is not. A non-compliant attribution review creates a warning but does not automatically suspend a client—suspension/revocation remains an explicit admin action.

## Security model

The service role and `API_KEY_PEPPER` are server-only. Keys have at least 256 bits of entropy and are stored only as a bounded prefix plus HMAC-SHA256 digest. Bearer extraction is strict, digest comparison is constant-time, all query/filter/cursor inputs are validated, and database access uses typed query methods rather than interpolated SQL. The API allowlist serializer removes internal source fields in addition to relying on the existing published/public projection.

## Manual QA (15 steps)

1. Submit `/en/api-access` with both consents and verify unchecked consent disables submission.
2. Repeat the access form and Terms page in Russian.
3. Open the pending request as an admin and approve it with endpoint/rate/origin settings.
4. Confirm the client exists and duplicate approval does not create another client.
5. Create the first key and copy its one-time raw value.
6. Close the one-time panel and confirm only its prefix remains visible.
7. Call `GET /api/v1/tournaments` with the Bearer key.
8. Follow a tournament slug to details.
9. Check stages, teams/rosters, and matches; inspect the serialized JSON for private fields.
10. Check bracket and standings.
11. Verify attribution JSON metadata, attribution headers, request ID, and rate-limit headers.
12. Follow `next_cursor`, then tamper with it and verify `INVALID_CURSOR`/400.
13. Reach the minute limit and verify 429 plus `Retry-After`.
14. Suspend, reactivate, rotate, then revoke keys/clients and verify old/revoked access is blocked immediately.
15. Check EN/RU docs/admin UI, keyboard flow, copy feedback, tables/code blocks, and the access form at 375 px.

## Known limitations and next stage

- PostgreSQL rate-limit buckets are an appropriate atomic MVP, not a globally distributed limiter; stale buckets require scheduled cleanup.
- Usage-log retention is documented as 90 days and needs an external scheduled maintenance job.
- Integration tests require local Supabase/Docker and are not replaced by mocked success claims when that environment is absent.
- Attribution compliance is reviewed manually; there is no crawler.
- Bracket and standings return complete public stage structures and have no conditional ETag in v1.

The next PR scope is the public design refresh; it should not expand this API’s data boundary or key-management model.
