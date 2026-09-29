import { describe, expect, it } from "vitest";
import { essayTextLength, essayWordCount, partCoverage, sanitizeEssayHtml } from "./essay";

describe("essay rich text helpers", () => {
  it("keeps allowed formatting and removes scripts and unsafe attributes", () => {
    const html = '<p><strong>tese</strong> <span data-part-id="4" style="color: #2d6cdf">clara</span><script>alert(1)</script></p>';
    expect(sanitizeEssayHtml(html)).toBe('<p><strong>tese</strong> <span data-part-id="4" style="color: #2d6cdf">clara</span></p>');
  });

  it("counts words from formatted content instead of tags", () => {
    expect(essayWordCount("<p><strong>Uma tese</strong> muito clara.</p>")).toBe(4);
    expect(essayTextLength("<p>Uma tese</p>")).toBe(8);
  });

  it("returns coverage for only the requested part", () => {
    const html = '<p><span data-part-id="1">Uma tese</span> funciona. <span data-part-id="2">Outro trecho</span>.</p>';
    expect(partCoverage(html, 1)).toBe(25);
    expect(partCoverage(html, 2)).toBe(38);
    expect(partCoverage(html, 7)).toBe(0);
  });
});
