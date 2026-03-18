# [caltech.dev](https://caltech.dev/) (formerly known as beave.red)

Made with ❤️ by [Rahul](https://github.com/rchalamala/), [Eric](https://github.com/ericlovesmath/), [Zack](https://github.com/zack466/).

In addition, thanks to [Armeet](https://github.com/armeetjatyani/) and others for suggestions/contributions!

Favicon art by Audrey Wong.

## Development

Install dependencies:

```bash
bun install
```

Start the dev server (Vite, port 3000):

```bash
bun run dev
```

## Validation

The repository includes a GitHub Actions CI workflow (`.github/workflows/ci.yml`)
that runs the same core checks used locally:

```bash
bun run lint       # ESLint with zero-warning policy
bun run test:run   # Vitest with coverage
bun run build      # TypeScript type-check + Vite production build
```

To run the full validation sequence locally in one command:

```bash
bun run check
```

## Deployment

The app deploys to **Cloudflare Pages/Workers**. The deploy configuration lives
in `wrangler.jsonc`, which serves the built `dist/` directory as a static site
with SPA routing (`not_found_handling: "single-page-application"`).

### Continuous deployment

Pushes to `main` trigger the CD workflow at `.github/workflows/deploy.yml`,
which builds the app and deploys it via Wrangler.

**Required GitHub repository secrets:**

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers Scripts:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Manual deploy

To deploy manually from a local machine:

```bash
bun run build
wrangler login       # one-time auth
bun run deploy
```

### Local production preview

To test the production build locally with Wrangler:

```bash
bun run build
bun run dev:wrangler -- --port 8787
# Open http://localhost:8787/
```

## Package manager

This repository uses a **Bun-first** workflow. Installing dependencies with
`npm install` is intentionally blocked so the committed `bun.lock` remains the
single source of truth for dependency resolution.
