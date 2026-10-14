import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  disableHeadlessTitleGeneration,
  installPipeCloseGuard,
} from "../../src/vendors/index.js";

describe("disableHeadlessTitleGeneration", () => {
  it("prevents SessionTitles from requesting generated titles", () => {
    class SessionTitles {
      canRequest(): boolean {
        return true;
      }
    }

    disableHeadlessTitleGeneration(SessionTitles);
    expect(new SessionTitles().canRequest()).toBe(false);
  });
});

describe("installPipeCloseGuard", () => {
  it("ignores non-object stream errors", () => {
    const stream = new PassThrough();
    installPipeCloseGuard([stream]);

    expect(() => {
      stream.emit("error", "broken");
    }).toThrow();
  });

  it("ignores expected broken-pipe errors", () => {
    const stream = new PassThrough();
    installPipeCloseGuard([stream]);

    expect(() => {
      stream.emit(
        "error",
        Object.assign(new Error("broken pipe"), { code: "EPIPE" }),
      );
    }).not.toThrow();
  });

  it("rethrows unexpected stream errors", () => {
    const stream = new PassThrough();
    installPipeCloseGuard([stream]);

    expect(() => {
      stream.emit("error", Object.assign(new Error("boom"), { code: "EIO" }));
    }).toThrow("boom");
  });
});
