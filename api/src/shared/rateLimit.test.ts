import { describe, expect, it } from "vitest";
import { advanceWindow, RATE_LIMIT_MAX_MESSAGES, RATE_LIMIT_WINDOW_MS } from "./rateLimit";

const NOW = 1_750_000_000_000;

describe("advanceWindow", () => {
  it("starts a fresh window for first-time sessions", () => {
    const { allowed, next } = advanceWindow(null, NOW);

    expect(allowed).toBe(true);
    expect(next).toEqual({ windowStart: NOW, count: 1 });
  });

  it("increments the count within an open window", () => {
    const { allowed, next } = advanceWindow({ windowStart: NOW - 10_000, count: 2 }, NOW);

    expect(allowed).toBe(true);
    expect(next).toEqual({ windowStart: NOW - 10_000, count: 3 });
  });

  it("blocks once the limit is reached in the window", () => {
    const { allowed } = advanceWindow(
      { windowStart: NOW - 10_000, count: RATE_LIMIT_MAX_MESSAGES },
      NOW
    );

    expect(allowed).toBe(false);
  });

  it("resets after the window expires", () => {
    const { allowed, next } = advanceWindow(
      { windowStart: NOW - RATE_LIMIT_WINDOW_MS, count: RATE_LIMIT_MAX_MESSAGES },
      NOW
    );

    expect(allowed).toBe(true);
    expect(next).toEqual({ windowStart: NOW, count: 1 });
  });
});
