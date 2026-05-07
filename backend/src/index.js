import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/db.js';
import { initVectorStore, ingestDocuments } from './services/rag.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import onboardingRoutes from './routes/onboarding.js';
import analyticsRoutes from './routes/analytics.js';
import chatRoutes from './routes/chat.js';
import telemetryRoutes from './routes/telemetry.js';
import signalsRoutes from './routes/signals.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..', '..');

// Ensure directories
mkdirSync(join(BASE, 'data'), { recursive: true });

// Initialize database
await initDb(join(BASE, 'data', 'itis.db'));

// Initialize vector store
initVectorStore(join(BASE, 'data', 'vectorstore'));

// Auto-ingest docs on startup if GEMINI_API_KEY is set
if (process.env.GEMINI_API_KEY) {
  const { getOne } = await import('./db/db.js');
  const tenant = getOne("SELECT id FROM tenants WHERE slug = 'acme'");
  if (tenant) {
    ingestDocuments(join(BASE, 'docs'), tenant.id).catch(err => {
      console.error('[startup] Doc ingestion failed:', err.message);
    });
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next(); });

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ai: !!process.env.GEMINI_API_KEY, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/signals', signalsRoutes);

// Error handler
app.use((err, req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[ITIS] Server running on http://localhost:${PORT}`);
  console.log(`[ITIS] AI: ${process.env.GEMINI_API_KEY ? 'Gemini enabled' : 'No API key (fallback mode)'}`);
  console.log(`[ITIS] Routes: auth, users, onboarding, analytics, chat, telemetry, signals`);
});

export default app;
