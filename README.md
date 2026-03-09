# [caltech.dev](https://caltech.dev/) (formerly known as beave.red)

Made with ❤️ by [Rahul](https://github.com/rchalamala/), [Eric](https://github.com/ericlovesmath/), [Zack](https://github.com/zack466/).

In addition, thanks to [Armeet](https://github.com/armeetjatyani/) and others for suggestions/contributions!

Favicon art by Audrey Wong.

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

## Validation

The repository now includes a GitHub Actions CI workflow that runs the same
core checks used locally:

```bash
npm run lint
npm run test:run
npm run build
```

To run the full validation sequence locally in one command:

```bash
npm run check
```
