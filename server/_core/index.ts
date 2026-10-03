import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { authenticateRequest, publicAuthConfig } from "./supabase";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/api/auth/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const config = publicAuthConfig();
    if (!config) { res.status(503).json({ error: "AUTH_NOT_CONFIGURED" }); return; }
    res.json(config);
  });
  app.use("/api/essays/upload", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      res.status(user ? 503 : 401).json({ error: user ? "STUDY_PERSISTENCE_UNAVAILABLE" : "UNAUTHORIZED" });
    } catch { res.status(503).json({ error: "AUTH_UNAVAILABLE" }); }
  });
  app.use(express.json({ limit: "64kb" }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Retired APIs must not fall through to the SPA with a misleading 200.
  app.use("/api", (_req, res) => { res.status(404).json({ error: "NOT_FOUND" }); });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "5000");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(() => { console.error("Application startup failed"); process.exitCode = 1; });
