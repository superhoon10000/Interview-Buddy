"use strict";

function boundedPositiveInteger(raw, fallback, min, max) {
  const value =
    raw === undefined || raw === ""
      ? fallback
      : Number(raw);

  if (
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `SEC-04 configuration must be an integer from ${min} to ${max}.`
    );
  }

  return value;
}

// Timeout for one Anthropic HTTP attempt.
const AI_PROVIDER_TIMEOUT_MS = boundedPositiveInteger(
  process.env.AI_PROVIDER_TIMEOUT_MS,
  20000,
  1000,
  120000
);

// Only reservations that never reached the provider
// can be reclaimed automatically after this period.
const AI_UNDISPATCHED_LEASE_MS = boundedPositiveInteger(
  process.env.AI_UNDISPATCHED_LEASE_MS,
  120000,
  30000,
  600000
);

// Minimum delay before a human operator can
// authorize retrying an uncertain evaluation.
const AI_REVIEW_DELAY_MS = boundedPositiveInteger(
  process.env.AI_REVIEW_DELAY_MS,
  300000,
  60000,
  86400000
);

// Bounded retries (see providerRetry.js). Only errors that prove the model
// never ran (429, 529, connection refused) are retried. 1 disables retries.
const AI_PROVIDER_MAX_ATTEMPTS = boundedPositiveInteger(
  process.env.AI_PROVIDER_MAX_ATTEMPTS,
  3,
  1,
  5
);

// First retry waits about this long; each later retry doubles it.
const AI_RETRY_BASE_DELAY_MS = boundedPositiveInteger(
  process.env.AI_RETRY_BASE_DELAY_MS,
  500,
  100,
  10000
);

// Cap on total waiting between retries, kept below the provider status
// grace window so a concurrent request still sees "in progress".
const AI_RETRY_MAX_TOTAL_DELAY_MS = boundedPositiveInteger(
  process.env.AI_RETRY_MAX_TOTAL_DELAY_MS,
  4000,
  0,
  20000
);

module.exports = {
  AI_PROVIDER_TIMEOUT_MS,
  AI_PROVIDER_MAX_ATTEMPTS,
  AI_RETRY_BASE_DELAY_MS,
  AI_RETRY_MAX_TOTAL_DELAY_MS,
  AI_UNDISPATCHED_LEASE_MS,
  AI_REVIEW_DELAY_MS,
};