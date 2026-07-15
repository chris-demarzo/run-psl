# Run PSL

A mobile-first directory for running events, recurring group runs, public routes, and local runner resources around Port St. Lucie and the Treasure Coast.

## Status

This repository is an MVP and deployment rehearsal. Listings are published only with a public source and verification date. Run PSL is an independent community project, not an official City of Port St. Lucie website.

## Stack

- Astro 7 static output
- TypeScript content schemas
- JSON-backed content collections
- Node test runner
- GitHub Actions verification
- Cloudflare Pages-compatible headers and build output

## Local development

```bash
npm ci
npm run dev
```

Open `http://localhost:4321`.

## Quality checks

```bash
npm run verify
```

This runs Astro diagnostics, a production build, and route-level acceptance tests.

## Production build

```bash
npm run build
```

Cloudflare Pages configuration:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22` |

## Content maintenance

Structured entries live in `src/data/`:

- `events.json`
- `groups.json`
- `routes.json`
- `resources.json`

Every entry must include a first-party or authoritative public URL and an ISO `verifiedDate`. Confirm schedule-sensitive information before publishing.
