import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { runCommand } from "../../src/shared/command.js";

export async function initGitRepo(rootDir: string): Promise<void> {
  await runCommand({
    command: "git",
    args: ["init", "-b", "main"],
    cwd: rootDir,
  });
  await runCommand({
    command: "git",
    args: ["config", "user.email", "test@example.com"],
    cwd: rootDir,
  });
  await runCommand({
    command: "git",
    args: ["config", "user.name", "Test User"],
    cwd: rootDir,
  });
  await writeFile(join(rootDir, "README.md"), "# test\n");
  await runCommand({
    command: "git",
    args: ["add", "README.md"],
    cwd: rootDir,
  });
  await runCommand({
    command: "git",
    args: ["commit", "-m", "initial"],
    cwd: rootDir,
  });
}

export async function writeTrackedFile(
  repoDir: string,
  relativePath: string,
  contents: string,
): Promise<void> {
  const filePath = join(repoDir, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}
