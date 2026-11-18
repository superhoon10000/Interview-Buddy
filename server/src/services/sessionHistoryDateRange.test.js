"use strict";

const { parseSessionHistoryDateRange } = require("./sessionHistoryDateRange");

describe("Analytics completed-session UTC date-range parsing", () => {
  test("uses inclusive UTC calendar days with an exclusive next-midnight boundary", () => {
    expect(parseSessionHistoryDateRange({
      startDate: "2026-10-01", endDate: "2026-10-31",
    })).toEqual({
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-11-01T00:00:00.000Z"),
      endDateExclusive: true,
    });
  });

  test("includes the entire end day even across a UTC year boundary", () => {
    expect(parseSessionHistoryDateRange({
      startDate: "2026-12-31", endDate: "2026-12-31",
    })).toEqual({
      startDate: new Date("2026-12-31T00:00:00.000Z"),
      endDate: new Date("2027-01-01T00:00:00.000Z"),
      endDateExclusive: true,
    });
  });

  test("supports exact UTC timestamp bounds and one-sided ranges", () => {
    expect(parseSessionHistoryDateRange({
      endDate: "2026-11-17T22:30:45.123Z",
    })).toEqual({
      startDate: null,
      endDate: new Date("2026-11-17T22:30:45.123Z"),
      endDateExclusive: false,
    });
    expect(parseSessionHistoryDateRange({
      startDate: "2026-11-17T22:30:45Z",
    })).toEqual({
      startDate: new Date("2026-11-17T22:30:45.000Z"),
      endDate: null,
    });
  });

  test.each([
    { startDate: "2026-02-30" },
    { endDate: "2026-13-01" },
    { startDate: "2026-11-17T99:00:00Z" },
    { endDate: "2026-11-17T12:60:00Z" },
    { startDate: "2026-11-17T12:00:00-08:00" },
    { startDate: "2026-11-18", endDate: "2026-11-17" },
    { startDate: "2026-11-18T12:00:00Z", endDate: "2026-11-18T11:00:00Z" },
    { startDate: ["2026-11-16", "2026-11-17"] },
    { startDate: "" },
  ])("rejects invalid date range %p", (range) => {
    try {
      parseSessionHistoryDateRange(range);
      throw new Error("Expected an invalid date-range error.");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        code: "SESSION_DATE_RANGE_INVALID",
      });
    }
  });
});
