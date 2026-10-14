import { createInterface } from "node:readline";

const readline = createInterface({ input: process.stdin });

readline.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  process.stdout.write(`${trimmed}\n`);
});
