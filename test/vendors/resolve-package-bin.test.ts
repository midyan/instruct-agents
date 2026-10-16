import { describe, expect, it } from "vitest";

import {
  resolveModuleRelativePath,
  resolvePackageBin,
} from "../../src/vendors/resolve-package-bin.js";

describe("resolvePackageBin", () => {
  it("resolves a named package binary", () => {
    expect(
      resolvePackageBin("@agentclientprotocol/codex-acp", "codex-acp"),
    ).toContain("codex-acp");
  });

  it("defaults to the first bin entry when no name is provided", () => {
    expect(resolvePackageBin("@agentclientprotocol/codex-acp")).toContain(
      "codex-acp",
    );
  });

  it("throws when the package has no bin entry", () => {
    expect(() => resolvePackageBin("zod")).toThrow(
      'Package "zod" does not expose a bin entry',
    );
  });

  it("resolves packages that expose bin as a single string path", () => {
    expect(resolvePackageBin("nanoid")).toContain("nanoid.js");
  });

  it("throws when the requested bin name is missing", () => {
    expect(() =>
      resolvePackageBin("@agentclientprotocol/codex-acp", "missing-bin"),
    ).toThrow(
      'Package "@agentclientprotocol/codex-acp" does not expose bin "missing-bin"',
    );
  });
});

describe("resolveModuleRelativePath", () => {
  it("resolves a path next to the current module", () => {
    expect(resolveModuleRelativePath("./cursor.ts")).toContain(
      "src/vendors/cursor.ts",
    );
  });
});
