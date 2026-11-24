import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function copyVendorDir(relativeSourceDir, files) {
  const sourceDir = join(rootDir, relativeSourceDir);
  const targetDir = join(rootDir, relativeSourceDir.replace(/^src\//, "dist/"));
  mkdirSync(targetDir, { recursive: true });
  for (const file of files) {
    cpSync(join(sourceDir, file), join(targetDir, file));
  }
}

copyVendorDir("src/vendors/claude", ["claude-launcher.mjs"]);
copyVendorDir("src/vendors/jev", ["jev-acp-shim.mjs", "map-decision.mjs"]);
