import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

export function fixturePath(name: string): string {
  return join(fixturesDir, name);
}
