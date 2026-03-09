---
name: cloud-agents-starter
description: Practical Cloud-agent setup, run, and test instructions for this codebase. Use this at the start of tasks that need local setup, app startup, Cloudflare preview, term-data updates, or browser workflow validation.
---

# Cloud agents starter

Use this skill first when an agent needs to run the app, validate a change, or figure out where a workflow lives.

## Quick facts

- Package manager: `npm`
- App type: single-page React + TypeScript app with Vite
- Cloud preview/deploy tool: Wrangler
- Backend/API: none in this repo; the app loads checked-in JSON from `src/data/`
- App login: none
- Env vars / feature flag service: none found

## Bootstrap

1. Install dependencies with `npm ci`.
2. For the fastest local loop, start Vite with `npm start -- --host 0.0.0.0`.
3. Open `http://localhost:3000/`. The default route redirects in-app to the hardcoded current term.
4. For a production-style local check, build first with `npm run build`, then start Wrangler with `npm run dev -- --port 8787`.
5. Open `http://localhost:8787/` for the Wrangler-served build.

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
- There is no feature-flag system. The closest flag-like switches are hardcoded constants:
  - `CURRENT_TERM` in `src/App.tsx`
  - `courseDataSources` in `src/App.tsx`
  - `hasWeekendCourse` in `src/Planner.tsx`
  - `DEFAULT_COURSES` in `src/Workspace.tsx`
  - `src/data/term_start_dates.json` for `.ics` export dates

## Codebase areas

### 1) App shell and term data

Files to check first:

- `src/App.tsx`
- `src/data/*.json`
- `src/data/term_start_dates.json`

What lives here:

- Term routing and the current-term default
- Static course catalog imports
- localStorage persistence for the five workspaces
- Section-arrangement generation and overlap filtering

Use this area when:

- A term route is broken
- New term data is being added
- Workspaces do not persist or reload correctly
- Added courses are not producing expected arrangements

Testing workflow:

1. Run `npm start -- --host 0.0.0.0`.
2. Open the target term route, such as `/sp2026`.
3. Add a few courses, switch between workspace tabs, and reload the page.
4. Confirm the same workspace content comes back after reload.
5. If you changed term support, verify the route loads data without the "Error loading course data" alert.
6. If you changed `.ics` term dates, also run the Workspace export flow in section 3 below.

### 2) Planner and calendar behavior

Files to check first:

- `src/Planner.tsx`
- `src/App.tsx`

What lives here:

- Time-string parsing
- Calendar rendering
- Weekday-only display behavior
- Available-time filtering

Use this area when:

- Calendar events render at the wrong time
- Time parsing is wrong for a section
- Availability filtering produces no schedules or wrong schedules
- Weekend visibility needs to change

Testing workflow:

1. Run `npm start -- --host 0.0.0.0`.
2. Add two or more courses with meeting times.
3. Confirm events appear on the calendar and match the selected sections.
4. Change the daily time pickers on the left to narrow availability.
5. Verify the arrangement count changes or the UI shows "No arrangements found :(" when expected.
6. If you touched parsing logic, test at least one course with multi-line meeting data and one with unusual times.

### 3) Workspace search, controls, sharing, and export

Files to check first:

- `src/Workspace.tsx`

What lives here:

- Course search and add/remove
- Section selection
- Lock/unlock and enable/disable
- Arrangement navigation
- Drag/drop reorder
- Workspace import/export
- `.ics` export

Use this area when:

- Search results look wrong
- Section changes do not stick
- Arrangement arrows behave incorrectly
- Import/export breaks
- Calendar downloads are wrong

Testing workflow:

1. Run `npm start -- --host 0.0.0.0`.
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

What lives here:

- Local Vite dev server config
- Production build command
- Static asset directory for Wrangler
- Deploy route config

Use this area when:

- A change works in Vite but not in the built app
- You need to validate the `dist/` output
- You need Cloudflare-compatible local serving
- You are preparing a deploy

Testing workflow:

1. Run `npm run build`.
2. Run `npm run dev -- --port 8787`.
3. Open `http://localhost:8787/`.
4. Re-test the exact user flow you changed against the Wrangler-served build.
5. If deploy work is required, run `npx wrangler whoami` first.
6. Only use `npm run deploy` after confirming authentication and a successful local build.

## Fast troubleshooting notes

- If Vite works but Wrangler does not reflect your change, rebuild first; Wrangler serves `dist/`, not live source files.
- If a route-specific issue only happens for one term, inspect `CURRENT_TERM`, `courseDataSources`, and the matching JSON import together.
- If a behavior only repros after reload, suspect localStorage before suspecting the calendar.
- If you need a quick "known-good" schedule seed, use the built-in "Default Schedule" button for the current term prefix.

## How to update this skill

When you discover a new reliable testing trick or runbook step:

1. Add it to the smallest relevant codebase-area section instead of dumping it into a generic notes block.
2. Include the exact command, route, or UI action sequence an agent should run.
3. State the expected result in one short sentence.
4. Mention any caveat, such as "requires rebuild first" or "works only on `sp` terms".
5. Remove or rewrite stale instructions when the codebase changes; do not keep conflicting old advice.
