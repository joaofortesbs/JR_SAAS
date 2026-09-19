export type FlowStatus = "running" | "paused" | "completed" | "cancelled";

export type FlowSession = {
  status: FlowStatus;
  accumulatedSeconds: number;
  lastResumedAt: Date | null;
};

export function elapsedSeconds(session: FlowSession, now = new Date()): number {
  const base = Math.max(0, session.accumulatedSeconds || 0);
  if (session.status !== "running" || !session.lastResumedAt) return base;
  return base + Math.max(0, Math.floor((now.getTime() - session.lastResumedAt.getTime()) / 1000));
}

export function actualMinutesFromSeconds(seconds: number): number {
  return Math.max(1, Math.round(Math.max(0, seconds) / 60));
}

export function dailyFlowSeries(
  sessions: Array<{ startedAt: Date; actualMinutes: number | null; status: string }>,
  days = 7,
  today = new Date(),
) {
  const series: Array<{ key: string; label: string; minutes: number }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const minutes = sessions
      .filter(session => session.status === "completed" && session.startedAt.toISOString().slice(0, 10) === key)
      .reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0);
    series.push({
      key,
      label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      minutes,
    });
  }
  return series;
}
