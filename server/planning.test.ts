import { describe, expect, it } from "vitest";
import { addMinutesToTime, generateStudyPlan } from "./planning";

describe("planning engine", () => {
  it("adds minutes without creating invalid clock values", () => {
    expect(addMinutesToTime("23:40", 50)).toBe("00:30");
    expect(addMinutesToTime("19:30", 90)).toBe("21:00");
  });

  it("creates one sustainable block per configured study window", () => {
    const plan = generateStudyPlan({
      weekStart: "2026-09-14",
      exams: [{ id: 1, name: "ENEM 2026", date: "2026-11-08", priority: "principal" }],
      topics: [{ id: 10, examId: 1, name: "Funções", subject: "Matemática", weight: 5 }],
      windows: [
        { weekday: 1, startTime: "19:30", endTime: "21:00", maxMinutes: 90 },
        { weekday: 3, startTime: "19:30", endTime: "20:30", maxMinutes: 60 },
      ],
    });

    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ date: "2026-09-14", startTime: "19:30", endTime: "21:00", topicId: 10, kind: "content" });
    expect(plan[1]).toMatchObject({ date: "2026-09-16", startTime: "19:30", endTime: "20:30", examId: 1 });
    expect(plan[0]?.reason).toContain("ENEM 2026");
  });

  it("does not invent a plan without a proof or a study window", () => {
    expect(generateStudyPlan({ exams: [], topics: [], windows: [] })).toEqual([]);
  });
});
