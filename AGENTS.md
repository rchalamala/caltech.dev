# AGENTS.md

## Cursor Cloud specific instructions

This is **caltech.dev**, a purely client-side React SPA for Caltech course scheduling. There is no backend, no database, and no external services required.

### Tech stack
- React 19 + TypeScript + Vite 7 (dev server on port 3000)
- Tailwind CSS 4 + MUI 7 + Emotion
- Deployed to Cloudflare Pages/Workers via Wrangler

### Package manager
- **Bun** is the canonical package manager (`bun.lock` is the lockfile)
- `npm install` is blocked by `enforce-bun.js`
- If Bun is unavailable in a Cloud VM, use `npx` to run individual tools (e.g., `npx vitest run`, `npx vite`)

### Running the app
- `bun run dev` — starts the Vite dev server on port 3000 with HMR
- `bun run build` — runs `tsc --noEmit` then `vite build` (output in `dist/`)
- `bun run dev:wrangler` — runs Wrangler local dev (Cloudflare Workers emulation); not required for standard development

### Lint / test
- ESLint is configured via `eslint.config.mjs` (flat config): `bun run lint`
- Tests use Vitest with jsdom + testing-library: `bun run test:run`
- Type checking: `bun run typecheck`
- Full validation: `bun run check` (lint + test + build)

### CI / CD
- CI runs on every push and PR via `.github/workflows/ci.yml` (lint, test, build)
- CD deploys to Cloudflare on push to `main` via `.github/workflows/deploy.yml`

### Data
- Course data lives as static JSON files in `src/data/` covering terms FA2022 through SP2026. No API calls are made.
- Term data is loaded dynamically via `import.meta.glob` in `src/lib/termData.ts`.
