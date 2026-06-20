import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDailySeries } from "./github-stats.ts";

const END = new Date(Date.UTC(2026, 5, 18)); // June (month is 0-indexed) 18, UTC

test("builds a 30-day window, fills gaps, clips overhang, ignores out-of-range peaks", () => {
  const weeks = [
    { contributionDays: [{ date: "2026-04-01", contributionCount: 99 }] }, // before window -> clipped
    {
      contributionDays: [
        { date: "2026-05-20", contributionCount: 5 }, // window start
        { date: "2026-06-01", contributionCount: 31 }, // in-window peak
        { date: "2026-06-18", contributionCount: 7 }, // window end (today)
      ],
    },
  ];

  const { series, max, current } = buildDailySeries(weeks, END, 30);

  assert.equal(series.length, 30);
  assert.equal(series[0].date, "2026-05-20");
  assert.equal(series[0].count, 5);
  assert.equal(series[29].date, "2026-06-18");
  assert.equal(series[29].count, 7);

  // Out-of-window 99 must not leak into the peak; gaps fill with 0.
  assert.equal(max, 31);
  assert.equal(current, 7);
  assert.equal(series.find((d) => d.date === "2026-05-21")?.count, 0);

  // Dates are continuous and ascending.
  for (let i = 1; i < series.length; i += 1) {
    assert.ok(series[i].date > series[i - 1].date);
  }
});

test("empty calendar yields a flat zero series with no NaN", () => {
  const { series, max, current } = buildDailySeries([], END, 30);

  assert.equal(series.length, 30);
  assert.equal(max, 0);
  assert.equal(current, 0);
  assert.ok(series.every((d) => d.count === 0));
});
