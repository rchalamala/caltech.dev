if (!process.env.npm_execpath?.includes("bun")) {
  console.error("This repository uses Bun. Run `bun install` instead of `npm install`.");
  process.exit(1);
}
