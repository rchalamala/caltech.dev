const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.includes("bun/")) {
  console.error(
    "This repository now requires Bun. Install dependencies with `bun install`.",
  );
  process.exit(1);
}
