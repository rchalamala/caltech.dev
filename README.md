# [caltech.dev](https://caltech.dev/) (formerly known as beave.red)

Made with ❤️ by [Rahul](https://github.com/rchalamala/), [Eric](https://github.com/ericlovesmath/), [Zack](https://github.com/zack466/).

In addition, thanks to [Armeet](https://github.com/armeetjatyani/) and others for suggestions/contributions!

Favicon art by Audrey Wong.

## Dependency notes

- `preact` and `@preact/signals` are never imported in `src/` directly — they are runtime peer dependencies of the Schedule-X calendar (`@schedule-x/*`) and must not be removed.
