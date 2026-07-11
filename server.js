import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
const DIST_DIR = path.resolve(__dirname, "dist");

// ---------------------------------------------------------------------------
// Backend target resolution
// ---------------------------------------------------------------------------
// • BACKEND_URL  — full URL, e.g. "https://api.example.com" (Coolify separate
//   resources).  If this is set it takes precedence over HOST/PORT.
// • BACKEND_HOST + BACKEND_PORT — for Docker Compose where containers share a
//   network, e.g. host = "backend", port = "5000".
// ---------------------------------------------------------------------------
const BACKEND_URL = process.env.BACKEND_URL || null;
const BACKEND_HOST = process.env.BACKEND_HOST || "backend";
const BACKEND_PORT = process.env.BACKEND_PORT || "5000";
const backendTarget = BACKEND_URL || `http://${BACKEND_HOST}:${BACKEND_PORT}`;

console.log(`[proxy] target → ${backendTarget}`);

// ── Health check ──────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Proxy /api requests to the backend ───────────────────────────────
app.use(
  "/api",
  createProxyMiddleware({
    target: backendTarget,
    changeOrigin: true,
  }),
);

// ── Serve static built assets ────────────────────────────────────────
app.use(express.static(DIST_DIR));

// ── SPA fallback — serve index.html for all non-file routes ──────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
