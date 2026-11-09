import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  DuplicateVendorError,
  UnknownVendorError,
} from "../../src/runtime/errors.js";
import { defineVendor, resolveVendorProcess } from "../../src/vendors/index.js";

describe("defineVendor", () => {
  it("registers a vendor and resolves through the registry", () => {
    const id = `test-custom-${randomUUID()}`;
    const catalog = defineVendor({
      id,
      models: {
        alpha: "alpha-1",
        beta: "beta-2",
      },
      resolveProcess: (definition) => ({
        command: "test-adapter",
        args: ["--model", definition.model],
      }),
    });

    expect(catalog).toEqual({
      vendor: id,
      model: {
        alpha: "alpha-1",
        beta: "beta-2",
      },
    });

    expect(
      resolveVendorProcess({
        vendor: catalog.vendor,
        model: catalog.model.alpha,
        cwd: "/tmp",
        responseSchema: {} as never,
      }),
    ).toEqual({
      command: "test-adapter",
      args: ["--model", "alpha-1"],
    });
  });

  it("throws when registering the same vendor id twice", () => {
    const id = `test-duplicate-${randomUUID()}`;

    defineVendor({
      id,
      models: { one: "one" },
      resolveProcess: () => ({ command: "a", args: [] }),
    });

    expect(() =>
      defineVendor({
        id,
        models: { two: "two" },
        resolveProcess: () => ({ command: "b", args: [] }),
      }),
    ).toThrow(DuplicateVendorError);
  });

  it("throws UnknownVendorError for an unregistered id", () => {
    expect(() =>
      resolveVendorProcess({
        vendor: `not-registered-${randomUUID()}`,
        model: "m",
        cwd: "/tmp",
        responseSchema: {} as never,
      }),
    ).toThrow(UnknownVendorError);
  });
});
