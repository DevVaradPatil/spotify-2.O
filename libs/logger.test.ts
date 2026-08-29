import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger, redact, setReporter } from "./logger";

describe("redact", () => {
  it("masks values whose key looks sensitive", () => {
    const result = redact({
      access_token: "abc",
      stripeSecretKey: "sk_live_x",
      Authorization: "Bearer y",
      cookie: "session=z",
      password: "hunter2",
    });

    expect(Object.values(result)).toEqual([
      "[redacted]",
      "[redacted]",
      "[redacted]",
      "[redacted]",
      "[redacted]",
    ]);
  });

  it("leaves ordinary fields intact", () => {
    expect(redact({ songId: 5, title: "Venom" })).toEqual({
      songId: 5,
      title: "Venom",
    });
  });

  it("matches case-insensitively and as a substring", () => {
    // The point is that an exhaustive key list is not required.
    expect(redact({ refreshTOKEN: "x" }).refreshTOKEN).toBe("[redacted]");
  });
});

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    setReporter(null);
    vi.restoreAllMocks();
  });

  it("forwards errors to a reporter", () => {
    const reporter = vi.fn();
    setReporter(reporter);

    const boom = new Error("boom");
    logger.error("Upload failed", { scope: "upload", songId: 3 }, boom);

    expect(reporter).toHaveBeenCalledWith(
      "error",
      "Upload failed",
      { scope: "upload", songId: 3 },
      boom
    );
  });

  it("does not forward info or debug", () => {
    const reporter = vi.fn();
    setReporter(reporter);

    logger.info("Just so you know", { scope: "test" });
    logger.debug("Noisy", { scope: "test" });

    expect(reporter).not.toHaveBeenCalled();
  });

  it("survives a reporter that throws", () => {
    setReporter(() => {
      throw new Error("reporter is down");
    });

    // A failing error reporter must not take down the code path it is
    // reporting on.
    expect(() => logger.error("still fine", { scope: "test" })).not.toThrow();
  });

  it("redacts sensitive context before writing", () => {
    logger.error("Auth failed", { scope: "auth", access_token: "secret-value" });

    const written = (console.error as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(JSON.stringify(written)).not.toContain("secret-value");
    expect(JSON.stringify(written)).toContain("[redacted]");
  });
});
