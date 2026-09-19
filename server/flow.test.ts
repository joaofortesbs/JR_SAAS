import { describe, expect, it } from "vitest";
import { actualMinutesFromSeconds, dailyFlowSeries, elapsedSeconds } from "./flow";

describe("Flow session rules", () => {
  it("keeps paused time stable and adds only the active interval", () => {
    const now = new Date("2026-09-19T12:01:30Z");
    expect(elapsedSeconds({ status: "paused", accumulatedSeconds: 90, lastResumedAt: null }, now)).toBe(90);
    expect(elapsedSeconds({ status: "running", accumulatedSeconds: 90, lastResumedAt: new Date("2026-09-19T12:00:00Z") }, now)).toBe(180);
  });

  it("never records a completed session as zero minutes", () => {
    expect(actualMinutesFromSeconds(0)).toBe(1);
    expect(actualMinutesFromSeconds(149)).toBe(2);
  });

  it("aggregates only completed sessions into the seven-day chart", () => {
    const today = new Date("2026-09-19T12:00:00Z");
    const series = dailyFlowSeries([
      { startedAt: new Date("2026-09-19T08:00:00Z"), actualMinutes: 35, status: "completed" },
      { startedAt: new Date("2026-09-19T09:00:00Z"), actualMinutes: 20, status: "running" },
    ], 2, today);
    expect(series[1]).toMatchObject({ key: "2026-09-19", minutes: 35 });
  });
});
