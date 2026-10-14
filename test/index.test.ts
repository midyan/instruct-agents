import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import { PACKAGE_NAME, PACKAGE_VERSION, getPackageInfo } from "../src/index.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  name: string;
  version: string;
};

describe("package metadata", () => {
  it("exports name and version from package.json", () => {
    expect(PACKAGE_NAME).toBe(packageJson.name);
    expect(PACKAGE_VERSION).toBe(packageJson.version);
  });

  it("returns package info from getPackageInfo", () => {
    expect(getPackageInfo()).toEqual({
      name: packageJson.name,
      version: packageJson.version,
    });
  });
});
