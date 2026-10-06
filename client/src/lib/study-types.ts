import type { Exam, Topic, StudyWindow, FixedCommitment, StudyBlock, StudySession, Essay, EssayPart, EssayVersion, EssayFeedback } from "../../../drizzle/schema";

// Domain record IDs are integers; authenticated account identities remain UUIDs.
type Owned<T> = Omit<T, "userId"> & { userId: string; revision?: number };
export type StudyState = {
  exams: Owned<Exam>[];
  topics: Owned<Topic>[];
  windows: Owned<StudyWindow>[];
  commitments: Owned<FixedCommitment>[];
  blocks: Owned<StudyBlock>[];
  sessions: Owned<StudySession>[];
  essays: Owned<Essay>[];
  parts: Owned<EssayPart>[];
  versions: Owned<EssayVersion>[];
  feedback: Owned<EssayFeedback>[];
  periods: { id: number; userId: string; sessionId: number; startedAt: Date; endedAt: Date | null; elapsedMs: number | null; createdAt: Date }[];
};

export const emptyStudyState = (): StudyState => ({
  exams: [], topics: [], windows: [], commitments: [],
  blocks: [], sessions: [], essays: [], parts: [], versions: [], feedback: [], periods: [],
});

// Rebuild supported tags instead of preserving user-provided attributes.
// This also works in tests without a browser DOM.
export function safeEssayHtml(html: string) {
  return html.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*>/g, tag => {
      const match = /^<(\/?)(strong|b|em|i|u|s|del|span|p|br)\b[^>]*>$/i.exec(tag);
      if (!match) return "";
      const [, closing, rawName] = match;
      const name = rawName.toLowerCase();
      if (closing) return name === "br" ? "" : `</${name}>`;
      if (name !== "span") return `<${name}>`;
      const part = /\bdata-part-id\s*=\s*["'](\d+)["']/i.exec(tag)?.[1];
      const style = /\bstyle\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
      const safeStyles = style.split(";").filter(value =>
        /^\s*(color|background-color|font-weight|font-style|text-decoration)\s*:\s*[#a-zA-Z0-9(),.%\s-]+\s*$/.test(value)
        && !/url|expression|var\s*\(/i.test(value)).join(";");
      return `<span${part ? ` data-part-id="${part}"` : ""}${safeStyles ? ` style="${safeStyles}"` : ""}>`;
    });
}
