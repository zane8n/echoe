# Echoe

Echoe is a calm, local-first milestone and habit tracker. It records milestones, dated check-ins, missed days, settings, ordered audit events, and state snapshots without framing progress around a lifetime countdown.

## Data Storage

The browser database is IndexedDB, named `echoe-core-v2`. It contains normalized milestone, check-in, settings, achievement, audit, snapshot, and sync metadata stores. Mutations are committed in order, deletes are soft-archived, the latest 1,000 audit entries and 120 snapshots are retained, and exports include the state plus recent history.

On the first v2 launch, stale `echoe.v1`, `echo.dashboard.v1`, and `echoe.audit.v1` localStorage blobs are deleted. New data starts empty and is added dynamically.

## Vercel Database

The app works offline from IndexedDB. For durable Vercel-backed sync, connect a Postgres provider such as Neon in the Vercel Marketplace and expose its `DATABASE_URL` to the project. The Next.js route at `/api/sync` then creates and uses:

- `echoe_state` for the latest versioned state per private browser installation
- `echoe_history` for append-only, sequential state history

The browser installation is identified by a random, HttpOnly, same-site cookie. Mutations remain optimistic and local-first; when cloud sync is unavailable the UI reports that state and keeps working. The reference schema is in `database/schema.sql`, and the route also initializes it safely on first use.

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tests cover empty-state removal, time calculations, dynamic countdowns and progress bars, dated success/missed check-ins, growth prompts, acrylic add/edit/settings surfaces, app and milestone themes, clustered histograms, IndexedDB ordering and history, stale-data cleanup, and the Vercel sync API contract.
