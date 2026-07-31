# DLTV Organizer Portal

Minimal application shell for the standalone DLTV tournament organizer portal.

## Requirements

- Node.js 24.x
- npm

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The Supabase variables are intentionally optional while the portal has no authentication or
business integration. If set, their shape is validated with Zod.

## Checks

```bash
npm run lint
npm run format:check
npm test
npm run build
```

The project uses standard Next.js build and start commands and requires no custom runtime, so it
can be deployed to Vercel as a Next.js project.
