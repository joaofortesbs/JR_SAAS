export type PlanningExam = {
  id: number;
  name: string;
  date: string;
  priority: "principal" | "alta" | "media" | "baixa";
};

export type PlanningTopic = {
  id: number;
  examId: number;
  name: string;
  subject: string;
  weight: number;
};

export type PlanningWindow = {
  weekday: number;
  startTime: string;
  endTime: string;
  maxMinutes: number;
  preference?: string | null;
};

export type SuggestedBlock = {
  examId: number;
  topicId?: number;
  title: string;
  kind: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  minimumVersion: string;
};

const priorityScore: Record<PlanningExam["priority"], number> = {
  principal: 4,
  alta: 3,
  media: 2,
  baixa: 1,
};

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function mondayOf(date: Date): Date {
  const result = new Date(date);
  const weekday = result.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

function daysUntil(examDate: string, reference: Date): number {
  return Math.ceil((parseDate(examDate).getTime() - reference.getTime()) / 86400000);
}

function sortExams(exams: PlanningExam[], reference: Date): PlanningExam[] {
  return [...exams].sort((a, b) => {
    const urgency = daysUntil(a.date, reference) - daysUntil(b.date, reference);
    if (urgency !== 0) return urgency;
    return priorityScore[b.priority] - priorityScore[a.priority];
  });
}

export function generateStudyPlan({
  weekStart,
  exams,
  topics,
  windows,
}: {
  weekStart?: string;
  exams: PlanningExam[];
  topics: PlanningTopic[];
  windows: PlanningWindow[];
}): SuggestedBlock[] {
  if (!exams.length || !windows.length) return [];
  const start = mondayOf(weekStart ? parseDate(weekStart) : new Date());
  const orderedExams = sortExams(exams, start);
  const orderedWindows = [...windows].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  const suggestions: SuggestedBlock[] = [];
  let cursor = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + offset);
    const weekday = day.getUTCDay();
    const date = toDateString(day);
    const dayWindows = orderedWindows.filter(window => window.weekday === weekday && window.maxMinutes >= 25);

    for (const window of dayWindows) {
      const exam = orderedExams[cursor % orderedExams.length];
      const topicCandidates = topics
        .filter(topic => topic.examId === exam.id)
        .sort((a, b) => b.weight - a.weight);
      const topic = topicCandidates[cursor % Math.max(topicCandidates.length, 1)];
      const durationMinutes = Math.min(Math.max(window.maxMinutes, 25), 90);
      const kind = topic ? "content" : "review";
      const title = topic ? `${topic.subject}: ${topic.name}` : `Revisar ${exam.name}`;
      const daysToExam = Math.max(0, daysUntil(exam.date, day));
      const reason = `${exam.name} é ${exam.priority === "principal" ? "a prova principal" : "uma prioridade"} e está a ${daysToExam} dias. ${topic ? `Conteúdo com peso ${topic.weight}/5.` : "Comece pela revisão essencial."}`;
      suggestions.push({
        examId: exam.id,
        ...(topic ? { topicId: topic.id } : {}),
        title,
        kind,
        date,
        startTime: window.startTime,
        endTime: addMinutesToTime(window.startTime, durationMinutes),
        durationMinutes,
        reason,
        minimumVersion: `Mínimo viável: ${Math.min(25, durationMinutes)} min de ${topic ? topic.name : "revisão"}.`,
      });
      cursor += 1;
    }
  }

  return suggestions;
}
