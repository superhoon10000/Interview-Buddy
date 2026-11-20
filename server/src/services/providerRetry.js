// server/src/services/providerRetry.js
//
// Bounded, observable retries for AI provider calls (see
// EVALUATION_RETRY_FALLBACK.md).
//
// SEC-04 rule: a failed provider call may still have been processed and
// billed, so we only retry errors that PROVE the model never ran:
//   - 429 rate limited and 529 overloaded (rejected before processing)
//   - connection refused / DNS failure (the request never reached the API)
// Timeouts, mid-request connection resets, 5xx errors and invalid model
// output are "uncertain" and are never retried automatically.

const {
  AI_PROVIDER_MAX_ATTEMPTS,
  AI_RETRY_BASE_DELAY_MS,
  AI_RETRY_MAX_TOTAL_DELAY_MS,
} = require("../config/evaluationRecovery");

const PROVIDER_ERROR_CLASSES = Object.freeze({
  RETRYABLE: "retryable",
  UNCERTAIN: "uncertain",
  FATAL: "fatal",
});

// The API rejected the request before the model ran.
const RETRYABLE_STATUSES = new Set([429, 529]);

// The request is wrong; retrying cannot help (config or code bug).
const FATAL_STATUSES = new Set([400, 401, 403, 404, 413, 422]);

// The connection failed before any request was sent.
const NOT_SENT_CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

// SDK errors keep their class name on the constructor; error.name is often
// just "Error".
function errorType(error) {
  return error?.constructor?.name || error?.name || "Error";
}

function classifyProviderError(error) {
  const status = error?.status;

  if (Number.isInteger(status)) {
    if (RETRYABLE_STATUSES.has(status)) {
      return PROVIDER_ERROR_CLASSES.RETRYABLE;
    }

    if (FATAL_STATUSES.has(status)) {
      return PROVIDER_ERROR_CLASSES.FATAL;
    }

    // 500, 502, 503, 504 and anything unknown: may have been processed.
    return PROVIDER_ERROR_CLASSES.UNCERTAIN;
  }

  // A timeout can fire after the model already ran.
  if (errorType(error) === "APIConnectionTimeoutError") {
    return PROVIDER_ERROR_CLASSES.UNCERTAIN;
  }

  const connectionCode = error?.cause?.code || error?.code;

  if (NOT_SENT_CONNECTION_CODES.has(connectionCode)) {
    return PROVIDER_ERROR_CLASSES.RETRYABLE;
  }

  // Connection resets, invalid JSON from the model, unknown errors.
  return PROVIDER_ERROR_CLASSES.UNCERTAIN;
}

// Anthropic sends retry-after in seconds. The SDK exposes headers either as
// a Headers object or a plain object depending on version.
function getRetryAfterMs(error) {
  const headers = error?.headers;

  if (!headers) {
    return null;
  }

  const raw =
    typeof headers.get === "function"
      ? headers.get("retry-after")
      : headers["retry-after"];

  // A missing header comes back as null, and Number(null) is 0, which would
  // retry instantly with no backoff, so treat empty values as "no header".
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return null;
  }

  const seconds = Number(raw);

  return Number.isFinite(seconds) && seconds >= 0
    ? Math.round(seconds * 1000)
    : null;
}

// Exponential backoff with a little random jitter so many users hitting the
// same outage do not retry at exactly the same moment.
function computeDelayMs(error, attempt, baseDelayMs, random) {
  const retryAfterMs = getRetryAfterMs(error);

  if (retryAfterMs !== null) {
    return retryAfterMs;
  }

  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(random() * (baseDelayMs / 2));

  return exponential + jitter;
}

function describeError(error) {
  if (Number.isInteger(error?.status)) {
    return `status=${error.status}`;
  }

  const code = error?.cause?.code || error?.code;
  return `error=${errorType(error)}${code ? ` code=${code}` : ""}`;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `call` with bounded retries for errors that prove the model never ran.
 *
 * On final failure the original error is re-thrown with:
 *   error.classification    "retryable" | "uncertain" | "fatal"
 *   error.attempts          how many attempts were made
 *   error.retryAfterSeconds suggested wait before the user tries again
 *                           (only for "retryable")
 *
 * Never logs the candidate answer, the prompt or API keys.
 */
async function withProviderRetry(
  call,
  {
    maxAttempts = AI_PROVIDER_MAX_ATTEMPTS,
    baseDelayMs = AI_RETRY_BASE_DELAY_MS,
    maxTotalDelayMs = AI_RETRY_MAX_TOTAL_DELAY_MS,
    sleep = defaultSleep,
    random = Math.random,
    logger = console,
    context = {},
  } = {}
) {
  const label = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  const prefix = label ? `[ai-eval] ${label}` : "[ai-eval]";

  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await call(attempt);

      if (attempt > 1) {
        logger.info(`${prefix} attempt=${attempt}/${maxAttempts} outcome=success`);
      }

      return result;
    } catch (error) {
      const classification = classifyProviderError(error);
      const delayMs =
        classification === PROVIDER_ERROR_CLASSES.RETRYABLE
          ? computeDelayMs(error, attempt, baseDelayMs, random)
          : 0;

      const canRetry =
        classification === PROVIDER_ERROR_CLASSES.RETRYABLE &&
        attempt < maxAttempts &&
        totalDelayMs + delayMs <= maxTotalDelayMs;

      logger.warn(
        `${prefix} attempt=${attempt}/${maxAttempts} outcome=${classification} ` +
          `${describeError(error)}${canRetry ? ` retryInMs=${delayMs}` : " giving-up"}`
      );

      if (!canRetry) {
        error.classification = classification;
        error.attempts = attempt;

        if (classification === PROVIDER_ERROR_CLASSES.RETRYABLE) {
          error.retryAfterSeconds = Math.max(
            1,
            Math.ceil((getRetryAfterMs(error) ?? baseDelayMs * 2 ** attempt) / 1000)
          );
        }

        throw error;
      }

      totalDelayMs += delayMs;
      await sleep(delayMs);
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error("Provider retry loop exited unexpectedly.");
}

module.exports = {
  PROVIDER_ERROR_CLASSES,
  classifyProviderError,
  getRetryAfterMs,
  withProviderRetry,
};