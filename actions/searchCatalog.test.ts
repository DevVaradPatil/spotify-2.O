import { describe, expect, it } from "vitest";

import { sanitizeForOrFilter } from "./searchCatalog";

describe("sanitizeForOrFilter", () => {
  it("strips characters PostgREST reads as filter syntax", () => {
    // A raw comma would terminate the current filter and start another one.
    expect(sanitizeForOrFilter("rock,pop")).toBe("rock pop");
    expect(sanitizeForOrFilter("a(b)c")).toBe("a b c");
    expect(sanitizeForOrFilter("back\\slash")).toBe("back slash");
  });

  it("neutralises an attempt to inject an extra filter", () => {
    const injected = sanitizeForOrFilter("x,user_id.eq.someone-else");
    expect(injected).not.toContain(",");
  });

  it("leaves ordinary queries alone", () => {
    expect(sanitizeForOrFilter("arijit singh")).toBe("arijit singh");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeForOrFilter("  venom  ")).toBe("venom");
  });

  it("reduces a query of only syntax characters to empty", () => {
    // Which sends the caller down the "no query" path rather than searching
    // for whitespace.
    expect(sanitizeForOrFilter(",,,")).toBe("");
  });
});
