require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('❌ Exception non capturée:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promise rejetée non gérée:', reason);
});

const http = require('http');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { initDB } = require('./db/init');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ JWT_SECRET trop court (minimum 16 caractères)');
  process.exit(1);
}

const db = initDB();

const app = express();
const server = http.createServer(app);

// Trust proxy if running behind one (needed for req.ip rate-limiting and secure cookies)
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY);
}

// CORS — strict allowlist. Never reflect arbitrary origins when using credentials.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4600,http://127.0.0.1:4600')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origine non autorisée par CORS' });
  }
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 204,
}));

// Expose the DB to middleware handlers (must_change_password enforcement, etc.)
app.set('db', db);

app.use(express.json({ limit: '1mb' }));

app.disable('x-powered-by');
app.use(compression());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

// Periodically purge stale rate-limit entries to avoid unbounded memory growth.
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW;
  for (const [ip, attempts] of loginAttempts) {
    if (attempts.length === 0 || attempts[attempts.length - 1] < cutoff) {
      loginAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

app.use('/api/auth/login', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const ip = req.ip;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }
  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
});

app.get('/admin.html', (req, res) => res.redirect(301, '/admin/index.html'));

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

app.use('/docs', express.static(path.join(__dirname, 'docs')));

const createAuthRouter = require('./routes/auth');
const createCollectesRouter = require('./routes/collectes');
const createAdminRouter = require('./routes/admin');

app.use('/api/auth', createAuthRouter(db));
app.use('/api/collectes', createCollectesRouter(db));
app.use('/api/admin', createAdminRouter(db));

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', uptime: process.uptime(), memory: process.memoryUsage().rss });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// --- WebSocket Server ---
function parseCookieToken(req) {
  const cookies = {};
  const header = req.headers.cookie;
  if (!header) return null;
  header.split(';').forEach(c => {
    const [key, ...val] = c.split('=');
    cookies[key.trim()] = val.join('=').trim();
  });
  return cookies.token || null;
}

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const token = parseCookieToken(req);
  if (!token) {
    ws.close(1008, 'Non authentifié');
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.id;
    ws.userRole = decoded.role;
    ws.isAlive = true;
  } catch {
    ws.close(1008, 'Session expirée');
    return;
  }

  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('close', () => { ws.isAlive = false; });
});

// Heartbeat — clean dead connections
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Broadcast function — exposed to routes
function broadcastNotification(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.userRole === 'admin') {
      client.send(payload);
    }
  });
}

function broadcastToUser(userId, data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.userId === userId) {
      client.send(payload);
    }
  });
}

app.set('broadcast', broadcastNotification);
app.set('broadcastToUser', broadcastToUser);

// --- AI Routes ---
const createAIRouter = require('./routes/ai');
app.use('/api/ai', createAIRouter(db, broadcastNotification));

const PORT = process.env.PORT || 4600;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 IPCE Dashboard running on 127.0.0.1:${PORT} (localhost only)`);
});

// --- Graceful shutdown ---
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} reçu — arrêt propre en cours...`);

  wss.clients.forEach(client => client.close(1001, 'Serveur en redémarrage'));

  server.close(() => {
    console.log('Serveur HTTP fermé.');
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('Base de données fermée proprement.');
    } catch (err) {
      console.error('Erreur fermeture DB:', err.message);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Arrêt forcé après 10s (connexions bloquantes).');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
