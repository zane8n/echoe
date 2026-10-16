# Echoe

Echoe is a calm, local-first milestone and habit tracker. It records milestones, dated check-ins, missed days, settings, ordered audit events, and state snapshots without framing progress around a lifetime countdown.

## Using Echoe

Echoe has four places: **Today**, **Paths**, **Momentum**, and **Friends**. Today holds everything that needs you now: the habits and projects due, your tasks, and the milestones you're counting toward. Each path's recent days are drawn as a beat strip, where a full beat is a check-in, a low beat a missed day, and a dot a day not recorded.

**Add anything from one place.** The New button (or ⌘K / Ctrl K, N, or /) opens the composer. Write it the way you'd say it:

| You type | Echoe creates |
| --- | --- |
| `Call the dentist 9:30` | A task for today at 09:30 |
| `Gym tomorrow 7am`, `Laundry sunday` | A task planned for that day |
| `Read 20 pages daily`, `Run 3x a week` | A daily or weekly habit |
| `Lisbon trip Nov 8`, `Launch in 3 weeks` | A countdown |
| `Thesis 40h by Dec 1` | A project with an effort budget |
| `Life in Nairobi since March 2023` | An ongoing path |

The chips under the input switch the type if the guess is wrong, and **More options** opens the full editor. Typing a path's name also finds it, and the composer doubles as a command palette for navigation, settings, appearance, and export.

**Gestures and shortcuts.** Tap a ring to check in and tap it again to take it back. On touch screens, swipe a row right to check in, swipe left to mark a habit missed (or delete a task), and press and hold for more actions. With a mouse, right-click a row or use its ⋯ button. Changes confirm with a toast that offers Undo, and Ctrl+Z undoes the last one. Sheets close with Escape, a tap outside, or by dragging their header down. Keys `1` to `4` switch tabs, `S` opens settings, and `?` lists every shortcut.

**History.** On a path's page, tap any day in the calendar to record, correct, or annotate it.

## Data Storage

The browser database is IndexedDB, named `echoe-core-v2`. It contains normalized milestone, check-in, settings, achievement, audit, snapshot, and sync metadata stores. Mutations are committed in order, deletes are soft-archived, the latest 1,000 audit entries and 120 snapshots are retained, and exports include the state plus recent history.

On the first v2 launch, stale `echoe.v1`, `echo.dashboard.v1`, and `echoe.audit.v1` localStorage blobs are deleted. New data starts empty and is added dynamically.

## Vercel Database And Accounts

The app works offline from IndexedDB. For durable Vercel-backed sync, connect a Postgres provider such as Neon in the Vercel Marketplace and expose its `DATABASE_URL` to the project. The Next.js route at `/api/sync` then creates and uses:

- `echoe_state` for the latest versioned state per private owner
- `echoe_history` for append-only, sequential state history
- `echoe_accounts` for named account handles and scrypt password hashes
- `echoe_friend_invites` and `echoe_friendships` for private, capability-based connections
- `echoe_path_shares` and `echoe_shared_checkins` for explicit spectator or participant collaboration
- `echoe_social_events` for ordered, bounded social audit history

Before registration, the browser installation is identified by a random, HttpOnly, same-site cookie. Creating an account binds the current history to a private handle; signing in on another browser restores that owner state. Passwords are salted and hashed server-side with scrypt and are never stored in the dashboard state. Mutations remain optimistic and local-first; when cloud sync is unavailable the UI reports that state and keeps working. The reference schema is in `database/schema.sql`, and the route also initializes it safely on first use.

The personal profile (name, intention, and preferred encouragement style) is part of the versioned state, so it is included in IndexedDB, exports, snapshots, and cloud sync. Existing v2 installations are migrated additively without clearing milestones or check-ins.

## Google Sign-In

Google sign-in uses a server-side OpenID Connect authorization-code flow with state and PKCE. The client secret and database connection string are only read by server routes and are never included in the browser bundle.

1. In Google Cloud Console, configure the OAuth consent screen.
2. Create an OAuth client with application type **Web application**.
3. Add `http://localhost:3000/api/auth/google/callback` as a local authorized redirect URI.
4. Add `https://YOUR_VERCEL_DOMAIN/api/auth/google/callback` as the production authorized redirect URI.
5. In Vercel, open **Project Settings > Environment Variables** and add `DATABASE_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` for Production and Preview as needed.
6. Redeploy after saving the variables.

Do not add a `NEXT_PUBLIC_` prefix to any of these values. The sample names are documented in `.env.example`; real secrets belong in `.env.local` for local work and in Vercel project settings for deployment.

## Private Friends And Shared Paths

Echoe has no user directory, handle search, profile suggestions, or public paths. A signed-in person creates a random one-time invite link that expires after seven days. The server stores only a SHA-256 hash of that capability token. Acceptance creates a private friendship; only then can either person explicitly share a path.

Spectators can view the shared path's check-in pace without changing it. Participants receive a separate check-in record and a private side-by-side pace view. Extra participant check-ins are only enabled when the path owner allows them, and are capped per day. Revoking a share or removing a friendship removes access and its associated collaboration records while leaving each person's private dashboard history untouched.

## Android And iOS Installation

The web app ships a standalone portrait PWA manifest, 192px and 512px Android icons, an iOS touch icon, safe-area layout, bounded offline asset caching, app shortcuts, and supported attention badges. Android browsers can present the native install prompt. On iPhone and iPad, Safari installs Echoe through Add to Home Screen. Platform-specific behavior is isolated so the next Capacitor phase can replace web adapters without rewriting milestone or social domain logic.

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

Tests cover natural-language parsing in the composer, one-tap and undoable check-ins, path summaries, dated success/missed check-ins and history editing, the path editor, settings and theme persistence, profile persistence, password and Google sign-in, private friends and sharing, clustered histograms, IndexedDB ordering and history, stale-data cleanup, and the sync API contract.
