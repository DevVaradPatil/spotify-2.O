export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Where the log came from, e.g. "getSongs" or "create-checkout-session". */
  scope: string;
  [key: string]: unknown;
}

/**
 * A reporter receives every warn/error. Wiring Sentry (or any other service)
 * means calling `setReporter` once at startup — see the note at the bottom of
 * this file. Nothing is installed by default, because an error reporter is a
 * third-party service and a DSN, which is the project owner's decision.
 */
export type Reporter = (
  level: LogLevel,
  message: string,
  context: LogContext,
  error?: unknown
) => void;

let reporter: Reporter | null = null;

export const setReporter = (next: Reporter | null) => {
  reporter = next;
};

const isProduction = process.env.NODE_ENV === "production";

/**
 * Keys whose values are never safe to log. Matched case-insensitively as a
 * substring, so `access_token`, `stripeSecretKey` and `authorization` are all
 * caught without needing an exhaustive list.
 */
const SENSITIVE = ["token", "secret", "password", "key", "authorization", "cookie"];

const isSensitive = (key: string) => {
  const lower = key.toLowerCase();
  return SENSITIVE.some((needle) => lower.includes(needle));
};

/**
 * Shallowly redacts values whose key looks sensitive.
 *
 * Structured logs get shipped to log drains and error services, so a context
 * object that happens to carry a session token would leak it somewhere it was
 * never meant to go. Redacting by key name is coarse but fails safe.
 */
export const redact = (context: Record<string, unknown>): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    output[key] = isSensitive(key) ? "[redacted]" : value;
  }
  return output;
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Stacks are useful in logs but noise in the browser console.
      ...(isProduction ? { stack: error.stack } : {}),
    };
  }
  if (error && typeof error === "object" && "message" in error) {
    return { message: String((error as { message: unknown }).message) };
  }
  return error === undefined ? undefined : { message: String(error) };
};

const write = (
  level: LogLevel,
  message: string,
  context: LogContext,
  error?: unknown
) => {
  const { scope, ...rest } = context;
  const payload = {
    level,
    scope,
    message,
    ...redact(rest),
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  };

  // One JSON object per line in production so Vercel's log drains can parse
  // it; a readable form in development.
  if (isProduction) {
    const line = JSON.stringify({ ...payload, timestamp: new Date().toISOString() });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else {
    const prefix = `[${scope}]`;
    if (level === "error") console.error(prefix, message, payload);
    else if (level === "warn") console.warn(prefix, message, payload);
    else if (level !== "debug") console.log(prefix, message, payload);
  }

  if (reporter && (level === "warn" || level === "error")) {
    try {
      reporter(level, message, context, error);
    } catch {
      // A failing reporter must never take down the thing it is reporting on.
    }
  }
};

export const logger = {
  debug: (message: string, context: LogContext) => write("debug", message, context),
  info: (message: string, context: LogContext) => write("info", message, context),
  warn: (message: string, context: LogContext, error?: unknown) =>
    write("warn", message, context, error),
  error: (message: string, context: LogContext, error?: unknown) =>
    write("error", message, context, error),
};

/**
 * To send errors to Sentry:
 *
 *   npm i @sentry/nextjs && npx @sentry/wizard@latest -i nextjs
 *
 * then, once per runtime (e.g. in instrumentation.ts):
 *
 *   import * as Sentry from "@sentry/nextjs";
 *   import { setReporter } from "@/libs/logger";
 *
 *   setReporter((level, message, context, error) => {
 *     Sentry.captureException(error ?? new Error(message), {
 *       level: level === "warn" ? "warning" : "error",
 *       tags: { scope: context.scope },
 *       extra: redact(context),
 *     });
 *   });
 *
 * Needs a DSN, so it is left unwired here rather than adding a third-party
 * dependency and an account requirement on the project's behalf.
 */
