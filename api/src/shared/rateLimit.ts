import { TableClient } from "@azure/data-tables";

/** Anonymous sessions may send this many chat messages per window. */
export const RATE_LIMIT_MAX_MESSAGES = 5;
export const RATE_LIMIT_WINDOW_MS = 60_000;

const RATE_LIMIT_PARTITION = "rate";

export type RateLimitWindow = {
  windowStart: number;
  count: number;
};

type RateLimitEntity = RateLimitWindow & {
  partitionKey: string;
  rowKey: string;
};

/**
 * Fixed-window rate limit decision. Pure function for unit testing.
 * Returns whether this request is allowed and the window state to persist.
 */
export const advanceWindow = (
  current: RateLimitWindow | null,
  now: number
): { allowed: boolean; next: RateLimitWindow } => {
  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    return { allowed: true, next: { windowStart: now, count: 1 } };
  }

  if (current.count >= RATE_LIMIT_MAX_MESSAGES) {
    return { allowed: false, next: current };
  }

  return {
    allowed: true,
    next: { windowStart: current.windowStart, count: current.count + 1 },
  };
};

/**
 * Storage-backed rate limit check keyed by session ID.
 * Fails closed: if Table Storage is unavailable, anonymous chat is blocked
 * so quota-protection cannot be bypassed during outages.
 */
export const checkRateLimit = async (
  client: TableClient,
  sessionId: string,
  now: number = Date.now()
): Promise<boolean> => {
  let current: RateLimitWindow | null = null;

  try {
    const entity = await client.getEntity<RateLimitEntity>(RATE_LIMIT_PARTITION, sessionId);
    current = {
      windowStart: Number(entity.windowStart) || 0,
      count: Number(entity.count) || 0,
    };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 404) {
      return false;
    }
  }

  const { allowed, next } = advanceWindow(current, now);

  if (allowed) {
    try {
      await client.upsertEntity(
        {
          partitionKey: RATE_LIMIT_PARTITION,
          rowKey: sessionId,
          windowStart: next.windowStart,
          count: next.count,
        },
        "Replace"
      );
    } catch {
      return false;
    }
  }

  return allowed;
};
