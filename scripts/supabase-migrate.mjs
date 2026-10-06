import fs from "node:fs/promises";
import path from "node:path";

// Administrative preparation only. Never imported by the web application.
const base = "supabase/migrations";
const url = process.env.SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !token) throw new Error("Configure the required Supabase secrets.");
const ref = new URL(url).hostname.split(".")[0];
const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/migrations`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const previous = await fetch(endpoint, { headers, signal: AbortSignal.timeout(30000) });
if (!previous.ok) throw new Error(`Migration history access failed (${previous.status}).`);
const history = await previous.json();
for (const filename of (await fs.readdir(base)).filter(file => file.endsWith(".sql")).sort()) {
  const [, version, name] = /^(\d+)_(.+)\.sql$/.exec(filename) ?? [];
  if (!version || !name) throw new Error("Invalid CLI-generated migration name.");
  if (history.some(row => row.version === version || row.name === name)) {
    console.log(JSON.stringify({ migration: name, status: "already_applied" }));
    continue;
  }
  const query = await fs.readFile(path.join(base, filename), "utf8");
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ name, query }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.log(JSON.stringify({ migration: name, status: "failed", httpStatus: response.status, reason: body.message ?? "Migration rejected" }));
    process.exit(1);
  }
  const refreshed = await fetch(endpoint, { headers, signal: AbortSignal.timeout(30000) });
  if (!refreshed.ok) throw new Error("Cannot verify applied migration history.");
  const entries = await refreshed.json();
  const applied = entries.find(row => row.name === name);
  if (!applied) throw new Error("Applied migration was not found in history.");
  // Management API generates its own version. Align the CLI-created filename
  // with that official version so later CLI workflows see consistent history.
  if (applied.version !== version) await fs.rename(path.join(base, filename), path.join(base, `${applied.version}_${name}.sql`));
  console.log(JSON.stringify({ migration: name, status: "applied_and_recorded", version: applied.version }));
}
