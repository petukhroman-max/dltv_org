# DLTV Organizer Portal

Standalone Next.js portal foundation for receiving and reviewing tournament
organizer submissions. Supabase provides the PostgreSQL database layer.

This stage contains no public submission API, form, organizer dashboard, or
admin UI.

## Requirements

- Node.js 24.x
- npm
- Supabase CLI for local database work
- Docker-compatible runtime for `supabase start`

Install the CLI by following the
[Supabase CLI documentation](https://supabase.com/docs/guides/local-development/cli/getting-started).

## Environment

Copy `.env.example` to `.env.local` and configure:

| Variable                        | Exposure    | Purpose                             |
| ------------------------------- | ----------- | ----------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Public      | Canonical application URL           |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public      | Supabase project API URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public      | RLS-constrained browser key         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only | Backend repository access           |
| `ADMIN_EMAILS`                  | Server only | Comma-separated MVP admin allowlist |

`ADMIN_EMAILS` is trimmed and normalized to lowercase. All values are required
in production, and the admin list must not be empty. Development and unit tests
may run without Supabase credentials. Never commit `.env.local`, access tokens,
project references, database passwords, or Docker secrets.

## Application development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase local development

The committed migration is the source of truth; do not create production
tables manually in the Supabase UI.

```bash
supabase init                  # only when config.toml does not exist
supabase start
supabase db reset
supabase status
supabase stop
```

For a remote project:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Generate authoritative types after linking a project:

```bash
supabase gen types typescript --project-id <PROJECT_REF> > src/lib/supabase/database.types.ts
```

The current `database.types.ts` is a manually maintained bootstrap file
synchronized with the initial migration. Do not commit a real project
reference.

## Security model

RLS is enabled on all four tables. There are intentionally no permissive
policies: `anon` and `authenticated` have no direct table access. Future public
submission handling will call backend code, and organizer-level policies will
be designed only after authentication and ownership are defined.

The service-role key bypasses RLS and therefore exists only in a `server-only`
module. Server repositories use that client and return safe `RepositoryError`
instances instead of leaking database details. The atomic creation RPC is
explicitly executable only by `service_role`.

## Checks

```bash
npm run build
npm run lint
npm run typecheck
npm run test
npm run format:check
npm audit --omit=dev
```

See [docs/database.md](docs/database.md) for the schema, lifecycle, repository
API, and migration details.
