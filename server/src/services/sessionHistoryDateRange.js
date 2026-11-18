"use strict";

// Date-only bounds cover inclusive UTC calendar days (end is implemented as
// the exclusive start of the following day). ISO timestamps are inclusive UTC
// instants. The query preserves completedAt ordering and the
// existing userId/status/completedAt Firestore composite index.
function parseBound(value, isEnd) {
  if (value === undefined) return null;
  if (typeof value !== "string") return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return null;
    }
    // Use next midnight as an exclusive upper bound. Unlike 23:59:59.999,
    // this also includes Firestore timestamps with sub-millisecond precision.
    if (isEnd) date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 19) !== value.slice(0, 19)) {
    return null;
  }
  return date;
}

function parseSessionHistoryDateRange({ startDate, endDate }) {
  const start = parseBound(startDate, false);
  const end = parseBound(endDate, true);
  if ((startDate !== undefined && !start) || (endDate !== undefined && !end) ||
      (start && end && (start.getTime() > end.getTime() ||
        (/^\d{4}-\d{2}-\d{2}$/.test(endDate) && start.getTime() === end.getTime())))) {
    const error = new Error("Invalid session date range. Use YYYY-MM-DD or a UTC ISO timestamp, with startDate not after endDate.");
    error.statusCode = 400;
    error.code = "SESSION_DATE_RANGE_INVALID";
    throw error;
  }
  return {
    startDate: start,
    endDate: end,
    ...(endDate !== undefined ? { endDateExclusive: /^\d{4}-\d{2}-\d{2}$/.test(endDate) } : {}),
  };
}

module.exports = { parseSessionHistoryDateRange };
