const ALLOWED_TAG_PATTERN = /^<\/?(strong|b|em|i|u|s|del|span|p|br)(\s[^>]*)?>$/i;
const STYLE_ATTR = /\sstyle\s*=\s*["']([^"']*)["']/i;

export function sanitizeEssayHtml(input: string) {
  const normalized = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  return normalized.replace(/<[^>]*>/g, tag => {
    if (!ALLOWED_TAG_PATTERN.test(tag)) return "";
    const isSpan = /^<span/i.test(tag);
    if (!isSpan) return tag.replace(/\s(class|id|on\w+)\s*=\s*["'][^"']*["']/gi, "");
    const part = tag.match(/data-part-id\s*=\s*["'](\d+)["']/i)?.[1];
    const style = tag.match(STYLE_ATTR)?.[1]?.replace(/[^a-zA-Z0-9:;#(),.%\s-]/g, "") ?? "";
    return `<span${part ? ` data-part-id="${part}"` : ""}${style ? ` style="${style}"` : ""}>`;
  });
}

export function essayTextLength(html: string) {
  return sanitizeEssayHtml(html).replace(/<br\s*\/?>(?=\S)/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().length;
}

export function essayWordCount(html: string) {
  const text = sanitizeEssayHtml(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export function partCoverage(html: string, partId: number) {
  const total = essayTextLength(html);
  if (!total) return 0;
  const safe = sanitizeEssayHtml(html);
  const matches = Array.from(safe.matchAll(new RegExp(`<span[^>]*data-part-id=["']${partId}["'][^>]*>([\\s\\S]*?)<\\/span>`, "gi")));
  const covered = matches.reduce((sum, match) => sum + essayTextLength(match[1] ?? ""), 0);
  return Math.min(100, Math.round((covered / total) * 100));
}
