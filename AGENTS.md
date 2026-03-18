# AGENTS.md

## Cursor Cloud specific instructions

This is a React + TypeScript SPA (Vite) for Caltech course scheduling, deployed to Cloudflare Workers. No backend or database services are required.

### Running the app

- `npm start` — starts the Vite dev server on port 3000 (hot reloading enabled).
- `npm run build` — runs `tsc && vite build`; outputs to `dist/`.
- `npm run dev` — runs Cloudflare Wrangler local dev (requires a prior build).

### Linting

- ESLint is listed as a devDependency but **no `.eslintrc` or `eslint.config.*` file** exists in the repo. Running `npx eslint` will fail with "couldn't find a configuration file." Type checking via `npx tsc --noEmit` is the primary static analysis tool.

### Testing

- There is no test framework or test suite configured in this project. Validation is done via `tsc --noEmit` (type checking) and manual testing in the browser.

### Term/year routing

- The app uses URL path segments for term selection (e.g., `/wi2026`, `/sp2026`, `/fa2025`). The default route loads the latest term.
