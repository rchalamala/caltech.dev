---
name: cloud-agents-starter
description: Practical Cloud-agent setup, run, and test instructions for this codebase. Use this at the start of tasks that need local setup, app startup, Cloudflare preview, term-data updates, or browser workflow validation.
---

# Cloud agents starter

Use this skill first when an agent needs to run the app, validate a change, or figure out where a workflow lives.

## Quick facts

- Package manager: **Bun** (`bun.lock` is the lockfile; `enforce-bun.js` blocks `npm install`)
- App type: single-page React + TypeScript app with Vite
- Cloud preview/deploy tool: Wrangler (Cloudflare Workers)
- Backend/API: none in this repo; the app loads checked-in JSON from `src/data/`
- App login: none
- Env vars / feature flag service: none found
- CI: GitHub Actions at `.github/workflows/ci.yml` (lint, test, build)
- CD: GitHub Actions at `.github/workflows/deploy.yml` (build + deploy to Cloudflare)

## Bootstrap

1. Install dependencies with `bun install`.
2. For the fastest local loop, start Vite with `bun run dev -- --host 0.0.0.0`.
3. Open `http://localhost:3000/`. The default route redirects in-app to the hardcoded current term.
4. For a production-style local check, build first with `bun run build`, then start Wrangler with `bun run dev:wrangler -- --port 8787`.
5. Open `http://localhost:8787/` for the Wrangler-served build.

> **Cloud VM note:** Bun may not be installed in every Cloud VM. If `bun` is unavailable, you can use `npx` to run individual tools (e.g., `npx vitest run`, `npx vite`), but avoid `npm install` which is intentionally blocked.

## Login and auth

- There is no product login flow in the app itself.
- Local Vite work does not require auth.
- Local `wrangler dev` works without logging in, but `wrangler whoami` reports unauthenticated in Cloud agents by default.
- If you truly need authenticated Cloudflare actions such as deploys, run `npx wrangler login` first, then re-check with `npx wrangler whoami`.

## Common state reset and mock knobs

- Browser persistence is entirely localStorage-based.
- Per-term workspace keys are `workspaces/<term>` and `workspaceIdx/<term>`, for example `workspaces/sp2026`.
- If state gets weird during testing, clear only the current term keys instead of all storage.
- There is no remote API to mock. The practical mock layer is the checked-in JSON under `src/data/`.
- There is no feature-flag system. The closest flag-like switches are:
  - `DEFAULT_TERM_PATH` in `src/lib/termData.ts` — controls which term loads for the `/` route
  - `hasWeekendCourse` in `src/Planner.tsx` — hardcoded boolean for weekend calendar display
  - `DEFAULT_COURSES` in `src/Workspace.tsx` — per-term-prefix default course lists
  - `src/data/term_start_dates.json` — term start dates used for `.ics` export

## Codebase areas

### 1) App shell and term data

Files to check first:

- `src/App.tsx`
- `src/lib/termData.ts`
- `src/data/*.json`
- `src/data/term_start_dates.json`

What lives here:

- Term routing via `resolveTermPath()` and dynamic `import.meta.glob` data loading
- The `DEFAULT_TERM_PATH` constant (currently `/sp2026`)
- localStorage persistence for the five workspaces
- Section-arrangement generation and overlap filtering

Use this area when:

- A term route is broken
- New term data is being added
- Workspaces do not persist or reload correctly
- Added courses are not producing expected arrangements

Testing workflow:

1. Run `bun run dev -- --host 0.0.0.0`.
2. Open the target term route, such as `/sp2026`.
3. Add a few courses, switch between workspace tabs, and reload the page.
4. Confirm the same workspace content comes back after reload.
5. If you changed term support, verify the route loads data without the error page.
6. If you changed `.ics` term dates, also run the Workspace export flow in section 3 below.

### 2) Planner and calendar behavior

Files to check first:

- `src/Planner.tsx`
- `src/lib/time.ts`
- `src/App.tsx`

What lives here:

- Time-string parsing (`parseTimes` in `src/lib/time.ts`)
- Calendar rendering (react-big-calendar)
- Weekday-only display behavior
- Available-time filtering via flatpickr time pickers

Use this area when:

- Calendar events render at the wrong time
- Time parsing is wrong for a section
- Availability filtering produces no schedules or wrong schedules
- Weekend visibility needs to change

Testing workflow:

1. Run `bun run dev -- --host 0.0.0.0`.
2. Add two or more courses with meeting times.
3. Confirm events appear on the calendar and match the selected sections.
4. Change the daily time pickers on the left to narrow availability.
5. Verify the arrangement count changes or the UI shows "No arrangements found :(" when expected.
6. If you touched parsing logic, test at least one course with multi-line meeting data and one with unusual times.

### 3) Workspace search, controls, sharing, and export

Files to check first:

- `src/Workspace.tsx`
- `src/lib/ics.ts`

What lives here:

- Course search and add/remove
- Section selection
- Lock/unlock and enable/disable
- Arrangement navigation
- Drag/drop reorder
- Workspace import/export
- `.ics` export (`exportICS` in `src/lib/ics.ts`)

Use this area when:

- Search results look wrong
- Section changes do not stick
- Arrangement arrows behave incorrectly
- Import/export breaks
- Calendar downloads are wrong

Testing workflow:

1. Run `bun run dev -- --host 0.0.0.0`.
2. Search for a course and add it.
3. Change its section, then toggle enabled and locked states.
4. Add enough courses to make the arrangement arrows meaningful, then step left and right.
5. Reorder courses with drag/drop.
6. Use "Export Workspace", copy the code, clear the current workspace, then use "Import Workspace" with that same code.
7. Use "Export .ics" and confirm the browser downloads a file.
8. Use "Default Schedule" only as a smoke test; it is backed by hardcoded defaults, not by generic logic.

### 4) Cloudflare-style preview and deploy path

Files to check first:

- `package.json`
- `wrangler.jsonc`
- `vite.config.ts`
- `.github/workflows/deploy.yml`

What lives here:

- Local Vite dev server config
- Production build command
- Static asset directory for Wrangler
- Deploy route config and CD automation

Use this area when:

- A change works in Vite but not in the built app
- You need to validate the `dist/` output
- You need Cloudflare-compatible local serving
- You are preparing a deploy

Testing workflow:

1. Run `bun run build`.
2. Run `bun run dev:wrangler -- --port 8787`.
3. Open `http://localhost:8787/`.
4. Re-test the exact user flow you changed against the Wrangler-served build.
5. If deploy work is required, run `npx wrangler whoami` first.
6. Only use `bun run deploy` after confirming authentication and a successful local build.

### 5) Validation and CI

Files to check first:

- `.github/workflows/ci.yml`
- `vitest.config.ts`
- `eslint.config.mjs`

What lives here:

- CI pipeline: lint (`eslint`), test (`vitest`), typecheck (`tsc`), build (`vite build`)
- Test setup (`src/test/setup.ts`) with jsdom and testing-library
- ESLint flat config

Run the full local validation:

```bash
bun run check   # runs lint, test:run, and build in sequence
```

Or individually:

```bash
bun run lint        # eslint with zero-warning policy
bun run test:run    # vitest with coverage
bun run typecheck   # tsc --noEmit for both tsconfigs
bun run build       # typecheck + vite build
```

## Fast troubleshooting notes

- If Vite works but Wrangler does not reflect your change, rebuild first; Wrangler serves `dist/`, not live source files.
- If a route-specific issue only happens for one term, inspect `DEFAULT_TERM_PATH` in `src/lib/termData.ts` and the matching JSON data file.
- If a behavior only repros after reload, suspect localStorage before suspecting the calendar.
- If you need a quick "known-good" schedule seed, use the built-in "Default Schedule" button for the current term prefix.
- SPA routing is handled by Cloudflare Workers (`wrangler.jsonc` → `not_found_handling: "single-page-application"`). There is no `404.html` redirect hack.

## How to update this skill

When you discover a new reliable testing trick or runbook step:

1. Add it to the smallest relevant codebase-area section instead of dumping it into a generic notes block.
2. Include the exact command, route, or UI action sequence an agent should run.
3. State the expected result in one short sentence.
4. Mention any caveat, such as "requires rebuild first" or "works only on `sp` terms".
5. Remove or rewrite stale instructions when the codebase changes; do not keep conflicting old advice.
