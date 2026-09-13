import { describe, expect, it } from "vitest";
import { safeFilename } from "./essayUpload";

describe("essay upload", () => {
  it("sanitizes names before using them as storage keys", () => {
    expect(safeFilename("Redação — versão final (João).pdf")).toBe("Redacao-versao-final-Joao.pdf");
    expect(safeFilename("   ")).toBe("redacao");
  });
});
