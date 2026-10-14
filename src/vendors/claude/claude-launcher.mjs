import { createRequire } from "node:module";

const adapterEntry = process.argv[2];

if (adapterEntry === undefined) {
  throw new Error("claude-launcher requires the claude-agent-acp entry path");
}

const requireFromLauncher = createRequire(import.meta.url);
const sessionTitlesPath = requireFromLauncher.resolve(
  "@agentclientprotocol/claude-agent-acp/dist/session-titles.js",
);
const sessionTitles = await import(sessionTitlesPath);

sessionTitles.SessionTitles.prototype.canRequest = () => false;

for (const stream of [process.stdin, process.stdout, process.stderr]) {
  stream?.on("error", (error) => {
    if (error?.code === "EPIPE" || error?.code === "ECONNRESET") {
      return;
    }

    throw error;
  });
}

await import(adapterEntry);
