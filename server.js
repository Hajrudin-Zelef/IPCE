require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
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

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.disable('x-powered-by');
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
  res.json({ status: 'ok' });
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
