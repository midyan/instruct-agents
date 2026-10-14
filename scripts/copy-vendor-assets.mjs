import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(rootDir, "src/vendors/claude");
const targetDir = join(rootDir, "dist/vendors/claude");

mkdirSync(targetDir, { recursive: true });
cpSync(
  join(sourceDir, "claude-launcher.mjs"),
  join(targetDir, "claude-launcher.mjs"),
);
