import type { Express, Request, Response } from "express";
import multer from "multer";
import { getDb, essays } from "./db";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "text/plain"];
    callback(null, allowed.includes(file.mimetype));
  },
});

function safeFilename(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").replace(/-(?=\.)/g, "").slice(0, 100) || "redacao";
}

export function registerEssayUploadRoute(app: Express) {
  app.post("/api/essays/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(401).json({ message: "UNAUTHORIZED" });
      }
      if (!user) return res.status(401).json({ message: "UNAUTHORIZED" });
      if (!req.file) return res.status(400).json({ message: "FILE_REQUIRED" });

      const db = await getDb();
      if (!db) return res.status(503).json({ message: "DATABASE_UNAVAILABLE" });
      const keyBase = `users/${user.id}/essays/${Date.now()}-${safeFilename(req.file.originalname)}`;
      const stored = await storagePut(keyBase, req.file.buffer, req.file.mimetype);
      const title = String(req.body.title || req.file.originalname).slice(0, 180);
      const theme = req.body.theme ? String(req.body.theme) : undefined;
      const bank = String(req.body.bank || "ENEM").slice(0, 80);
      const examId = req.body.examId ? Number(req.body.examId) : undefined;
      const [created] = await db.insert(essays).values({ userId: user.id, title, theme, bank, examId, source: "upload", fileKey: stored.key, currentText: "", status: "draft" }).$returningId();
      return res.status(201).json({ id: created.id, fileKey: stored.key, url: stored.url });
    } catch (error) {
      console.error("[EssayUpload] Failed:", error);
      return res.status(500).json({ message: "UPLOAD_FAILED" });
    }
  });
}

export { safeFilename };
