# [caltech.dev](https://caltech.dev/) (formerly known as beave.red)

Made with ❤️ by [Rahul](https://github.com/rchalamala/), [Eric](https://github.com/ericlovesmath/), [Zack](https://github.com/zack466/).

In addition, thanks to [Armeet](https://github.com/armeetjatyani/) and others for suggestions/contributions!

Favicon art by Audrey Wong.

## Development

Install dependencies:

```bash
bun install
```

Start the dev server:

```bash
bun run dev
```

## Validation

The repository now includes a GitHub Actions CI workflow that runs the same
core checks used locally:

```bash
bun run lint
bun run test:run
bun run build
```

To run the full validation sequence locally in one command:

```bash
bun run check
```

## Package manager

This repository now uses a Bun-first workflow. Installing dependencies with
`npm install` is intentionally blocked so the committed `bun.lock` remains the
single source of truth for dependency resolution.
