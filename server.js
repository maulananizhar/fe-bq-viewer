import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
const BACKEND_HOST = process.env.BACKEND_HOST || 'backend';
const BACKEND_PORT = process.env.BACKEND_PORT || '5000';
const DIST_DIR = path.resolve(__dirname, 'dist');

// ── Health check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Proxy /api requests to the backend ───────────────────────────────
app.use(
  '/api',
  createProxyMiddleware({
    target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
    changeOrigin: true,
  }),
);

// ── Serve static built assets ────────────────────────────────────────
app.use(express.static(DIST_DIR));

// ── SPA fallback — serve index.html for all non-file routes ──────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
