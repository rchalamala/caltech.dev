# AGENTS.md

## Cursor Cloud specific instructions

This is **caltech.dev**, a purely client-side React SPA for Caltech course scheduling. There is no backend, no database, and no external services required.

### Tech stack
- React 18 + TypeScript + Vite 7 (dev server on port 3000)
- Tailwind CSS + MUI + Emotion
- Deployed to Cloudflare Pages/Workers via Wrangler

### Running the app
- `npm start` — starts the Vite dev server on port 3000 with HMR
- `npm run build` — runs `tsc` then `vite build` (output in `dist/`)
- `npm run dev` — runs Wrangler local dev (Cloudflare Workers emulation); not required for standard development

### Lint / test
- ESLint is listed as a devDependency but **no `.eslintrc` or `eslint.config.*` file exists** in the repo, so `npx eslint` will error about missing config. Type checking is done via `tsc` as part of `npm run build`.
- There are no automated tests in the repo.

### Data
- Course data lives as static JSON files in `src/data/` covering terms FA2022 through SP2026. No API calls are made.
