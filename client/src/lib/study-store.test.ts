import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyStore } from "./study-store";
import { safeEssayHtml } from "./study-types";

afterEach(() => vi.useRealTimers());
const exam = { name: "ENEM 2026", institution: "INEP", date: "2026-11-15", priority: "alta" as const };
describe("temporary study workspace", () => {
  it("starts empty, isolates owners and discards all records", () => {
    const a = new StudyStore("account-a"), b = new StudyStore("account-b");
    a.mutations.exams.create(exam);
    expect(a.getSnapshot().exams[0].userId).toBe("account-a");
    expect(b.getSnapshot().exams).toEqual([]);
    a.clear();
    expect(a.getSnapshot().exams).toEqual([]);
    expect(() => a.mutations.exams.update({ ...exam, id: 1 })).toThrow();
  });
  it("creates, edits and archives exams; invalid dates never change state", () => {
    const s = new StudyStore("a");
    expect(() => s.mutations.exams.create({ ...exam, date: "2026-02-31" })).toThrow();
    const { id } = s.mutations.exams.create(exam);
    s.mutations.exams.update({ ...exam, id, name: "Vestibular" });
    s.mutations.exams.close({ id });
    expect(s.getSnapshot().exams[0]).toMatchObject({ name: "Vestibular", status: "completed" });
    s.mutations.exams.delete({ id });
    expect(s.getSnapshot().exams).toEqual([]);
  });
  it("validates routine duration and conflicts independently of removed modules", () => {
    const s = new StudyStore("a");
    s.mutations.exams.create(exam);
    expect(() => s.mutations.routine.addWindow({ weekday: 1, startTime: "20:00", endTime: "19:00", maxMinutes: 60 })).toThrow();
    const window = s.mutations.routine.addWindow({ weekday: 1, startTime: "19:00", endTime: "21:00", maxMinutes: 60 });
    expect(() => s.mutations.routine.addCommitment({ title: "Aula", weekday: 1, startTime: "20:00", endTime: "22:00" })).toThrow();
    expect(s.mutations).not.toHaveProperty("planning");
    expect(s.mutations).not.toHaveProperty("resources");
    expect(s.getSnapshot()).not.toHaveProperty("resources");
    s.mutations.routine.deleteWindow(window);
    expect(s.getSnapshot().windows).toEqual([]);
  });
  it("counts only running time and prevents duplicate active sessions", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    const s = new StudyStore("a"), e = s.mutations.exams.create(exam);
    const block = s.mutations.flows.createAdHoc({ examId: e.id });
    const session = s.mutations.flows.start({ blockId: block.id });
    expect(() => s.mutations.flows.start({ blockId: block.id })).toThrow(/ACTIVE_FLOW/);
    vi.advanceTimersByTime(60000); s.mutations.flows.pause(session);
    vi.advanceTimersByTime(60000); expect(s.queries.flows.active()?.elapsedSeconds).toBe(60);
    s.mutations.flows.resume(session); vi.advanceTimersByTime(60000);
    expect(s.mutations.flows.complete(session).actualMinutes).toBe(2);
    expect(s.queries.flows.active()).toBeNull();
    expect(() => s.mutations.flows.complete(session)).toThrow();
  });
  it("edits essays, creates versions, rejects invalid part ownership and removes data", () => {
    const s = new StudyStore("a");
    const e = s.mutations.essays.create({ title: "Meu texto" });
    const other = s.mutations.essays.create({ title: "Outro texto" });
    const part = s.mutations.essays.createPart({ essayId: e.id, name: "Introdução" });
    s.mutations.essays.autosave({ ...e, title: "Meu texto", currentText: "<p>Olá</p>" });
    expect(s.getSnapshot().versions).toHaveLength(0);
    s.mutations.essays.save({ ...e, title: "Meu texto", currentText: "<p>Revisado</p>" });
    expect(s.queries.essays.detail(e).versions[0].versionNumber).toBe(1);
    expect(() => s.mutations.essays.applyPart({ essayId: other.id, partId: part.id, currentText: "teste" })).toThrow();
    expect(() => s.mutations.essays.reorderParts({ essayId: e.id, partIds: [part.id, part.id] })).toThrow();
    s.mutations.essays.delete(e);
    expect(s.getSnapshot().parts).toEqual([]);
    expect(s.getSnapshot().versions).toEqual([]);
  });
  it("never preserves event handlers or unsafe HTML attributes", () => {
    const html = safeEssayHtml('<p onmouseover=alert(1)>Texto<img src=x onerror=alert(1)><script>alert(1)</script><span data-part-id="1" style="color:red;background-image:url(x)">Parte</span></p>');
    expect(html).toBe('<p>Texto<span data-part-id="1" style="color:red">Parte</span></p>');
  });
});
